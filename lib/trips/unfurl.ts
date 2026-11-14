import { lookup } from "node:dns/promises";
import { BlockList } from "node:net";

// Reads the one page behind a link a user saved and pulls out a name and,
// where the page gives one, a pin. Nothing else of the page is kept.

export type Unfurled = {
  name?: string;
  lat?: number;
  lng?: number;
  note?: string;
};

const USER_AGENT =
  "pgoell.com link reader (trip planner; reads one page when a user saves its link)";
const TIMEOUT_MS = 4000;
const MAX_BYTES = 512 * 1024;
const MAX_HOPS = 4;

// Instagram shows a signed-out server only a login wall, so do not ask.
const SKIP = /(^|\.)instagram\.com$/;

// Where a pasted link must never lead: this machine, the Docker network,
// the cloud metadata address and every other range that is not public.
const closed = new BlockList();
for (const [net, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3],
] as const)
  closed.addSubnet(net, bits);
for (const [net, bits] of [
  ["::", 127],
  ["64:ff9b::", 96],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const)
  closed.addSubnet(net, bits, "ipv6");

/** One request, no redirects, to the address checked here and no other. */
async function get(url: URL, signal: AbortSignal): Promise<Response> {
  if (!/^https?:$/.test(url.protocol) || url.port || url.username)
    throw new Error("Not a plain web link");
  const found = await lookup(url.hostname.replace(/^\[|\]$/g, ""), {
    all: true,
  });
  const first = found.find((a) => a.family === 4) ?? found[0];
  if (
    !first ||
    found.some((a) => closed.check(a.address, a.family === 6 ? "ipv6" : "ipv4"))
  )
    throw new Error("Not a public address");
  // Connect to the checked address itself, so a second DNS answer cannot
  // point the request somewhere else.
  const pinned = new URL(url);
  pinned.hostname = first.family === 6 ? `[${first.address}]` : first.address;
  return fetch(pinned, {
    headers: {
      Host: url.host,
      "User-Agent": USER_AGENT,
      Accept: "text/html",
      "Accept-Language": "en",
    },
    tls: { serverName: url.hostname },
    redirect: "manual",
    signal,
  });
}

async function text(res: Response): Promise<string> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = res.body?.getReader();
  while (reader && size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  await reader?.cancel();
  const charset = res.headers.get("content-type")?.match(/charset=([\w-]+)/i);
  return new TextDecoder(charset?.[1] ?? "utf-8").decode(Buffer.concat(chunks));
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function tidy(v: unknown): string {
  if (typeof v !== "string" && typeof v !== "number") return "";
  return String(v)
    .replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (all, e: string) =>
      e[0] !== "#"
        ? (ENTITIES[e] ?? all)
        : String.fromCodePoint(
            /^#x/i.test(e) ? parseInt(e.slice(2), 16) : Number(e.slice(1)),
          ),
    )
    .replace(/\s+/g, " ")
    .trim();
}

function pin(lat: unknown, lng: unknown): { lat?: number; lng?: number } {
  const a = tidy(lat) ? Number(lat) : Number.NaN;
  const b = tidy(lng) ? Number(lng) : Number.NaN;
  const ok = Math.abs(a) <= 90 && Math.abs(b) <= 180 && (a !== 0 || b !== 0);
  return ok ? { lat: a, lng: b } : {};
}

type Node = Record<string, unknown>;
const node = (v: unknown): Node =>
  v && typeof v === "object" ? (v as Node) : {};

/** Every object in the page's JSON-LD blocks, nested ones included. */
function jsonLd(html: string): Node[] {
  const out: Node[] = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      out.push(v as Node);
      Object.values(v).forEach(walk);
    }
  };
  for (const [, body] of html.matchAll(
    /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      walk(JSON.parse(body ?? ""));
    } catch {}
  }
  return out;
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  return m?.[1] ?? m?.[2] ?? m?.[3];
}

function extract(html: string): Unfurled {
  // A place is the JSON-LD object that carries coordinates (a Restaurant,
  // a Place). Other objects (articles, breadcrumbs) have names we do not want.
  const place = jsonLd(html).find((n) => "lat" in pin(...latLng(n))) ?? {};
  const tags = [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => tag);
  const og = tags.find((t) => attr(t, "property") === "og:title");
  const title =
    tidy(og && attr(og, "content")) ||
    tidy(html.match(/<title[^>]*>([^<]*)/i)?.[1]);
  // "Name | Site" and "Name - Site": keep the name.
  const short = title.replace(/\s[|\p{Pd}]\s[^|\p{Pd}]*$/u, "");

  const address = place.address;
  const note = [
    [place.servesCuisine].flat().map(tidy).join(",").replace(/,\s*/g, ", "),
    tidy(address) || tidy(node(address).addressLocality),
  ]
    .filter(Boolean)
    .join(". ");

  return {
    name: (tidy(place.name) || short || title).slice(0, 80) || undefined,
    ...pin(...latLng(place)),
    note: note.slice(0, 200) || undefined,
  };
}

function latLng(n: Node): [unknown, unknown] {
  const geo = node(n.geo);
  return [geo.latitude, geo.longitude];
}

/**
 * A Google Maps link says in its own text what it points at: the name in the
 * path and, in links copied from a browser, the place's coordinates as
 * `!3d..!4d..` (the `@lat,lng` part is only where the map was scrolled to).
 * We read the link and never the page behind it.
 */
function googleMaps(url: URL): Unfurled | undefined {
  if (!/(^|\.)google\.[a-z.]+$/.test(url.hostname)) return undefined;
  if (!url.pathname.startsWith("/maps")) return undefined;
  const path = decodeURIComponent(url.pathname);
  const at =
    path.match(/!3d(-?[\d.]+)!4d(-?[\d.]+)/) ??
    path.match(/^\/maps\/(?:place|search)\/(-?\d+\.\d+),[\s+]*(-?\d+\.\d+)/);
  const name = path.match(/^\/maps\/place\/([^/@]+)/)?.[1]?.replace(/\+/g, " ");
  return {
    name:
      (/^-?\d+\.\d+,/.test(name ?? "") ? "" : tidy(name)).slice(0, 80) ||
      undefined,
    ...pin(at?.[1], at?.[2]),
  };
}

async function read(link: string, signal: AbortSignal): Promise<Unfurled> {
  let url = new URL(link);
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    if (SKIP.test(url.hostname)) return {};
    const map = googleMaps(url);
    if (map) return map;
    const res = await get(url, signal);
    const next = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && next) {
      await res.body?.cancel();
      url = new URL(next, url);
      continue;
    }
    if (
      res.status !== 200 ||
      !/html/i.test(res.headers.get("content-type") ?? "")
    ) {
      await res.body?.cancel();
      return {};
    }
    return extract(await text(res));
  }
  return {};
}

/** What the page behind a link says about a place. Empty when it says nothing, is too slow or may not be read. */
export async function unfurl(link: string): Promise<Unfurled> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const late = new Promise<Unfurled>((done) =>
    signal.addEventListener("abort", () => done({})),
  );
  return Promise.race([read(link, signal), late]).catch(() => ({}));
}

/**
 * Fills what the user left open on a new place from its link: the name when it
 * is still just the link's host, the pin and the note when there is none.
 * The user's own words always win.
 */
export async function fillFromLink<
  T extends {
    name: string;
    url: string | null;
    note: string | null;
    lat: number | null;
    lng: number | null;
  },
>(row: T): Promise<T> {
  if (!row.url) return row;
  const found = await unfurl(row.url);
  const bare = (s: string) => s.replace(/^www\./, "");
  const unnamed =
    URL.canParse(row.url) && bare(row.name) === bare(new URL(row.url).hostname);
  return {
    ...row,
    name: (unnamed && found.name) || row.name,
    note: row.note ?? found.note ?? null,
    ...(row.lat === null && found.lat !== undefined
      ? { lat: found.lat, lng: found.lng }
      : {}),
  };
}
