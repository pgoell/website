/**
 * The map's tiles and fonts come from OpenFreeMap, but through this server:
 * a visitor's browser asks pgoell.com only, so OpenFreeMap never sees it.
 */

const SOURCE = "https://tiles.openfreemap.org";
const ONE_HOUR = 3600;
export const ONE_DAY = "public, max-age=86400";

/** The fonts the map style uses. Others are not passed on. */
export const MAP_FONTS = ["Noto Sans Regular", "Noto Sans Bold"];

/** True for a tile address that can exist: whole numbers, inside the grid. */
export function isTile(z: number, x: number, y: number, deepest = 14): boolean {
  if (![z, x, y].every(Number.isInteger)) return false;
  if (z < 0 || z > deepest) return false;
  const size = 2 ** z;
  return x >= 0 && x < size && y >= 0 && y < size;
}

/** The closest zoom the satellite images are asked for. */
export const SATELLITE_DEEPEST = 19;
export const isSatelliteTile = (z: number, x: number, y: number) =>
  isTile(z, x, y, SATELLITE_DEEPEST);

/** True for a glyph range file such as "0-255.pbf". */
export function isGlyphRange(range: string): boolean {
  const m = /^(\d{1,5})-(\d{1,5})\.pbf$/.exec(range);
  if (!m) return false;
  const start = Number(m[1]);
  return start % 256 === 0 && Number(m[2]) === start + 255 && start < 65536;
}

/** OpenFreeMap's tile address changes with each weekly build; its TileJSON names it. */
async function tileTemplate(): Promise<string | null> {
  try {
    const res = await fetch(`${SOURCE}/planet`, {
      next: { revalidate: ONE_HOUR },
    });
    if (!res.ok) return null;
    const url = ((await res.json()) as { tiles?: unknown[] }).tiles?.[0];
    return typeof url === "string" && url.startsWith(`${SOURCE}/`) ? url : null;
  } catch {
    return null;
  }
}

async function pass(url: string): Promise<Response> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    // A tile of open sea does not exist. That is an answer, not a fault.
    if (res.status === 404 || res.status === 204)
      return new Response(null, {
        status: 204,
        headers: { "Cache-Control": ONE_DAY },
      });
    if (!res.ok) return new Response(null, { status: 502 });
    return new Response(await res.arrayBuffer(), {
      headers: {
        "Content-Type": "application/x-protobuf",
        "Cache-Control": ONE_DAY,
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}

export async function tile(z: number, x: number, y: number): Promise<Response> {
  const template = await tileTemplate();
  if (!template) return new Response(null, { status: 502 });
  return pass(
    template
      .replace("{z}", String(z))
      .replace("{x}", String(x))
      .replace("{y}", String(y)),
  );
}

export const glyphs = (font: string, range: string): Promise<Response> =>
  pass(`${SOURCE}/fonts/${encodeURIComponent(font)}/${range}`);

/*
 * Satellite images for the map of someone signed in: Esri's World Imagery,
 * asked with the key in ARCGIS_API_KEY, which stays on this server. Esri's
 * terms allow tracing over these images, which a route drawn by hand is.
 */
const IMAGERY =
  "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile";

/** One tile of satellite images. Esri counts rows before columns. */
export async function satellite(
  z: number,
  x: number,
  y: number,
  key: string,
): Promise<Response> {
  try {
    const res = await fetch(
      `${IMAGERY}/${z}/${y}/${x}?token=${encodeURIComponent(key)}`,
      { cache: "no-store" },
    );
    const type = res.headers.get("Content-Type") ?? "";
    // A refused key comes back as 200 with an error in JSON.
    if (!res.ok || !type.startsWith("image/"))
      return new Response(null, { status: 502 });
    return new Response(await res.arrayBuffer(), {
      headers: {
        "Content-Type": type,
        // Only for the person signed in, so no shared cache keeps it.
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
