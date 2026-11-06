/* Depth of field for the Gelnhausen scene: each drawn plane stands at a rough distance,
   and a plane blurs by how far its distance lies from the focus, measured in dioptres (1 / m)
   as a real lens does. */

/** The scene's planes, back to front, with a rough distance in metres. */
export const PLANES = [
  { id: "sky", m: Number.POSITIVE_INFINITY },
  { id: "hills", m: 3000 },
  { id: "church", m: 90 },
  { id: "town", m: 220 },
  { id: "near", m: 35 },
] as const;

export type Plane = (typeof PLANES)[number]["id"];

/** Blur in CSS px per dioptre of defocus, on a 1440 px wide frame. */
const K = 240;
/** No plane ever blurs more than this, on a 1440 px wide frame. */
const MAX = 6;

const dioptres = (p: Plane) => {
  const m = PLANES.find((q) => q.id === p)?.m ?? Number.POSITIVE_INFINITY;
  return 1 / m;
};

/** Blur radius in CSS px for `plane` when the lens focuses on `focus`, when the drawing is `width` px wide. */
export function blurFor(plane: Plane, focus: Plane, width: number): number {
  const d = Math.abs(dioptres(plane) - dioptres(focus));
  return Math.min(MAX, K * d) * (width / 1440);
}

/** The lens's full stops, wide open first. */
export const STOPS = [2.8, 4, 5.6, 8, 11, 16, 22] as const;
export type Stop = (typeof STOPS)[number];
export const DEFAULT_STOP: Stop = 2.8;

/** At this stop and beyond, the whole scene is sharp. */
const SHARP = 11;

/** How much of the full blur a stop lets through: 1 wide open at f/2.8, 0 from f/11 on.
    Blur follows 1 / N as on a real lens, shifted so f/11 lands on zero. */
export function apertureScale(n: number): number {
  const k = (1 / n - 1 / SHARP) / (1 / DEFAULT_STOP - 1 / SHARP);
  return Math.max(0, Math.min(1, k));
}

/** The next stop up, or down with `dir` -1; it stops at either end. */
export function stepStop(n: Stop, dir: 1 | -1): Stop {
  const i = STOPS.indexOf(n);
  return STOPS[Math.max(0, Math.min(STOPS.length - 1, i + dir))] ?? n;
}

/** A stored value back to a stop, or the default when it is not one. */
export function toStop(v: unknown): Stop {
  const n = Number(v);
  return (STOPS as readonly number[]).includes(n) ? (n as Stop) : DEFAULT_STOP;
}
