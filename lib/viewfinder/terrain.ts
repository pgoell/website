import { smoothstep as sm } from "./color";

/** Stylised Kinzigtal around Gelnhausen: Büdinger Wald to the north, Spessart to the south. */

export interface Peak {
  x: number;
  y: number;
}

function hash(i: number, j: number): number {
  const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function valueNoise(x: number, y: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  return (
    (hash(i, j) * (1 - u) + hash(i + 1, j) * u) * (1 - v) +
    (hash(i, j + 1) * (1 - u) + hash(i + 1, j + 1) * u) * v
  );
}

export function fbm(x: number, y: number): number {
  let a = 0;
  let f = 1;
  let m = 1;
  let s = 0;
  for (let k = 0; k < 4; k++) {
    a += m * valueNoise(x * f, y * f);
    s += m;
    f *= 2.03;
    m *= 0.5;
  }
  return a / s;
}

/** The Kinzig, as a fraction of map height for a fraction of map width. */
export const river = (u: number): number =>
  0.53 - 0.05 * u + 0.022 * Math.sin(u * 9 + 1);

/** Elevation in metres at (u, v) in map fractions; `aspect` is width / height. */
export function elevation(
  u: number,
  v: number,
  aspect: number,
  peaks: readonly Peak[],
): number {
  const d = v - river(u);
  const X = u * aspect;
  let e = 120 + 10 * u;
  if (d < 0) {
    // Büdinger Wald plateau and its side valleys
    const n = -d + 0.05 * (fbm(X * 4, v * 2) - 0.5);
    e +=
      265 * sm(0.05, 0.26, n) + 70 * fbm(X * 3 + 2, v * 3) * sm(0.03, 0.2, n);
    for (const t of [0.36, 0.8]) {
      const c = t + 0.035 * Math.sin(v * 14 + t * 9);
      e -=
        95 *
        Math.exp(-((u - c) ** 2) / (2 * (0.012 + 0.03 * n) ** 2)) *
        sm(0.04, 0.3, n);
    }
  } else {
    // Spessart foothills
    const s2 = d + 0.05 * (fbm(X * 4 + 9, v * 2) - 0.5);
    e +=
      200 * sm(0.06, 0.3, s2) +
      140 * fbm(X * 2.4 + 7, v * 2.4 + 3) * sm(0.05, 0.25, d);
    const c = 0.62 + 0.03 * Math.sin(v * 13);
    e -=
      85 *
      Math.exp(-((u - c) ** 2) / (2 * (0.012 + 0.03 * d) ** 2)) *
      sm(0.05, 0.3, d);
  }
  for (const p of peaks) {
    const dx = X - p.x * aspect;
    const dy = v - p.y;
    e += 55 * Math.exp(-(dx * dx + dy * dy) / (2 * 0.05 * 0.05));
  }
  return e;
}

export interface Field {
  data: Float32Array;
  nx: number;
  ny: number;
  cell: number;
  width: number;
  height: number;
}

/** Samples the elevation on a grid of `cell` pixels for a map of width x height. */
export function buildField(
  width: number,
  height: number,
  cell: number,
  peaks: readonly Peak[],
): Field {
  const nx = Math.ceil(width / cell) + 2;
  const ny = Math.ceil(height / cell) + 2;
  const data = new Float32Array(nx * ny);
  const aspect = width / height;
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++)
      data[j * nx + i] = elevation(
        (i * cell) / width,
        (j * cell) / height,
        aspect,
        peaks,
      );
  return { data, nx, ny, cell, width, height };
}

export const cellAt = (f: Field, i: number, j: number): number =>
  f.data[j * f.nx + i] as number;

/** Elevation at a pixel position, nearest grid sample. */
export function altitudeAt(f: Field, x: number, y: number): number {
  const i = Math.max(0, Math.min(f.nx - 1, Math.round(x / f.cell)));
  const j = Math.max(0, Math.min(f.ny - 1, Math.round(y / f.cell)));
  return cellAt(f, i, j);
}

const TINT: ReadonlyArray<
  readonly [number, readonly [number, number, number]]
> = [
  [110, [14, 26, 22]],
  [160, [18, 32, 26]],
  [260, [26, 42, 34]],
  [360, [40, 56, 44]],
  [460, [58, 74, 58]],
];

/** Hypsometric tint for an elevation. */
export function tint(e: number): number[] {
  for (let i = 1; i < TINT.length; i++) {
    const [e1, c1] = TINT[i] as (typeof TINT)[number];
    if (e <= e1 || i === TINT.length - 1) {
      const [e0, c0] = TINT[i - 1] as (typeof TINT)[number];
      const t = Math.max(0, Math.min(1, (e - e0) / (e1 - e0)));
      return c0.map((v, k) => v + ((c1[k] as number) - v) * t);
    }
  }
  return [0, 0, 0];
}

/** Marching squares edge pairs per corner case (edges: 0 top, 1 right, 2 bottom, 3 left). */
const CASES: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [],
  [[3, 2]],
  [[2, 1]],
  [[3, 1]],
  [[0, 1]],
  [
    [3, 0],
    [2, 1],
  ],
  [[0, 2]],
  [[3, 0]],
  [[3, 0]],
  [[0, 2]],
  [
    [0, 1],
    [3, 2],
  ],
  [[0, 1]],
  [[3, 1]],
  [[2, 1]],
  [[3, 2]],
  [],
];

/** Contour line segments at level t, in pixels, as flat [x1, y1, x2, y2, ...]. */
export function contour(f: Field, t: number): number[] {
  const out: number[] = [];
  const { nx, ny, cell } = f;
  for (let j = 0; j < ny - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const a = cellAt(f, i, j);
      const b = cellAt(f, i + 1, j);
      const c = cellAt(f, i + 1, j + 1);
      const d = cellAt(f, i, j + 1);
      const segs =
        CASES[
          (a > t ? 8 : 0) | (b > t ? 4 : 0) | (c > t ? 2 : 0) | (d > t ? 1 : 0)
        ] ?? [];
      const edge = (k: number): [number, number] =>
        k === 0
          ? [i + (t - a) / (b - a), j]
          : k === 1
            ? [i + 1, j + (t - b) / (c - b)]
            : k === 2
              ? [i + (t - d) / (c - d), j + 1]
              : [i, j + (t - a) / (d - a)];
      for (const [e1, e2] of segs) {
        const p1 = edge(e1);
        const p2 = edge(e2);
        out.push(p1[0] * cell, p1[1] * cell, p2[0] * cell, p2[1] * cell);
      }
    }
  return out;
}

const degMin = (v: number): string => {
  const d = Math.floor(v);
  return `${d}°${((v - d) * 60).toFixed(1)}′`;
};

/** Map pixel to a made-up but plausible coordinate around Gelnhausen. */
export const formatPosition = (
  x: number,
  y: number,
  width: number,
  height: number,
): string =>
  `N ${degMin(50.27 - (y / height) * 0.14)} E ${degMin(9.02 + (x / width) * 0.34)}`;
