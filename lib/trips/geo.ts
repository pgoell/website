import type { LngLat } from "./types";

const TOLERANCE = 8; // metres a simplified line may leave the real one

/** Metres between two points. Flat earth is good enough at these distances. */
export function metres(a: LngLat, b: LngLat) {
  const x = (b[0] - a[0]) * Math.cos(((a[1] + b[1]) / 2) * (Math.PI / 180));
  return Math.hypot(x, b[1] - a[1]) * 111_195;
}

/** Douglas-Peucker: drop every point closer than the tolerance to the line kept. */
export function simplify(line: LngLat[]): LngLat[] {
  const keep = new Set([0, line.length - 1]);
  const todo: [number, number][] = [[0, line.length - 1]];
  for (let span = todo.pop(); span; span = todo.pop()) {
    const [a, b] = [line[span[0]] as LngLat, line[span[1]] as LngLat];
    const length = metres(a, b);
    const wide = Math.cos(a[1] * (Math.PI / 180));
    let far = -1;
    let most = TOLERANCE;
    for (let i = span[0] + 1; i < span[1]; i++) {
      const p = line[i] as LngLat;
      // How far p lies off the straight line from a to b.
      const cross =
        (b[0] - a[0]) * wide * (p[1] - a[1]) -
        (b[1] - a[1]) * (p[0] - a[0]) * wide;
      const off =
        length < 1 ? metres(a, p) : (Math.abs(cross) * 111_195 ** 2) / length;
      if (off > most) {
        most = off;
        far = i;
      }
    }
    if (far > 0) {
      keep.add(far);
      todo.push([span[0], far], [far, span[1]]);
    }
  }
  return line
    .filter((_, i) => keep.has(i))
    .map((p) => [+p[0].toFixed(5), +p[1].toFixed(5)]);
}
