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

/** The resting look, with nothing in focus: the distance slightly soft, the rest sharp. */
export function restBlur(plane: Plane, width: number): number {
  return plane === "hills" ? width / 2600 : 0;
}
