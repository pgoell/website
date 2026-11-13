import { isTile, tile } from "@/lib/trips/tiles";

/** One map tile, passed on from OpenFreeMap. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const p = await params;
  const [z, x, y] = [p.z, p.x, p.y].map((v) =>
    /^\d{1,6}$/.test(v) ? Number(v) : Number.NaN,
  ) as [number, number, number];
  if (!isTile(z, x, y)) return new Response(null, { status: 404 });
  return tile(z, x, y);
}
