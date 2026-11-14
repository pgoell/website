/**
 * Builds the light map (components/trips/map-style-day.json) from the night
 * one: every colour keeps its hue and swaps dark for light, on a paper tone.
 * Run it again when map-style.json is copied over from the trips repo:
 *   bun scripts/build-day-map-style.ts
 */
import night from "../components/trips/map-style.json";

type Rgba = [number, number, number, number];

function parse(c: string): Rgba | null {
  const hex = /^#([0-9a-f]{6})$/i.exec(c);
  if (hex) {
    const n = Number.parseInt(hex[1] as string, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const m = /^rgba?\(([^)]+)\)$/.exec(c);
  if (!m) return null;
  const p = (m[1] as string).split(",").map(Number);
  if (p.length < 3 || p.some(Number.isNaN)) return null;
  return [p[0] as number, p[1] as number, p[2] as number, p[3] ?? 1];
}

function toHsl(r: number, g: number, b: number): [number, number, number] {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === R
      ? (G - B) / d + (G < B ? 6 : 0)
      : max === G
        ? (B - R) / d + 2
        : (R - G) / d + 4;
  return [h / 6, s, l];
}

function toRgb(h: number, s: number, l: number): [number, number, number] {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    const u = (t + 1) % 1;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255)) as [
    number,
    number,
    number,
  ];
}

/** Paper, not white: the lightest tone the map reaches. */
const PAPER = [1, 0.985, 0.945];

function flip(c: string): string {
  const v = parse(c);
  if (!v) return c;
  const [r, g, b, a] = v;
  if (a === 0) return c;
  const [h, s, l] = toHsl(r, g, b);
  const rgb = toRgb(h, Math.min(1, s * 0.95), 0.06 + (1 - l) * 0.92).map(
    (x, i) => Math.round(x * (PAPER[i] as number)),
  );
  return a === 1
    ? `#${rgb.map((x) => x.toString(16).padStart(2, "0")).join("")}`
    : `rgba(${rgb.join(",")},${a})`;
}

function walk(o: unknown): unknown {
  if (typeof o === "string") return /^(#|rgba?\()/.test(o) ? flip(o) : o;
  if (Array.isArray(o)) return o.map(walk);
  if (o && typeof o === "object") {
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, walk(v)]));
  }
  return o;
}

const day = {
  ...night,
  name: "pgoell day",
  sky: walk(night.sky),
  layers: walk(night.layers),
};
await Bun.write(
  new URL("../components/trips/map-style-day.json", import.meta.url),
  `${JSON.stringify(day, null, 2)}\n`,
);
console.log("wrote components/trips/map-style-day.json");
