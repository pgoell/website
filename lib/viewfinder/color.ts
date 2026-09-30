/** Small colour and randomness helpers shared by the scene, the map and the readouts. */

export type RGB = [number, number, number];

export const hexToRgb = (h: string): RGB => [
  Number.parseInt(h.slice(1, 3), 16),
  Number.parseInt(h.slice(3, 5), 16),
  Number.parseInt(h.slice(5, 7), 16),
];

export const rgbToHex = (c: readonly number[]): string =>
  `#${c
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

const cache = new Map<string, string>();

/** Linear mix of two #rrggbb colours; memoised because the scene calls it thousands of times per frame. */
export function mix(a: string, b: string, t: number): string {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const k = a + b + ((t * 1000) | 0);
  const hit = cache.get(k);
  if (hit) return hit;
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const v = rgbToHex(A.map((q, i) => q + ((B[i] as number) - q) * t));
  if (cache.size > 20000) cache.clear();
  cache.set(k, v);
  return v;
}

export function rgba(h: string, a: number): string {
  const c = hexToRgb(h);
  return `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

/** Seeded PRNG (mulberry32), so every drawing is the same on every load. */
export function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Park-Miller PRNG used by the readouts and the playback art. */
export function lcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
