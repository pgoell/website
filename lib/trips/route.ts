import { metres } from "./geo";
import type { DrawnPoint, LngLat } from "./types";

/** How a stretch runs into its point. */
export type Way = "road" | "straight" | "free";

/** A road between two points, as the router gave it. */
export type Road = { line: LngLat[]; m: number; s: number };

/** The roads known so far, by `roadKey`. Null: the router found none. */
export type Roads = ReadonlyMap<string, Road | null>;

export type Stretch = {
  /** "wait": the road is still asked for. "none": there is no road. */
  kind: Way | "wait" | "none";
  line: LngLat[];
  m: number;
  /** Seconds by car. Only a road has them. */
  s: number;
};

/** The most points one leg's line may have. */
export const MOST_POINTS = 60;
/** The most points one stretch drawn by hand may have. */
export const MOST_DRAWN = 400;

export const round = (p: LngLat): LngLat => [
  +p[0].toFixed(5),
  +p[1].toFixed(5),
];

export const roadKey = (a: LngLat, b: LngLat) =>
  `${round(a).join(",")};${round(b).join(",")}`;

export const wayOf = (p: DrawnPoint): Way =>
  p.road ? "road" : p.line?.length ? "free" : "straight";

export const lengthOf = (line: LngLat[]) =>
  line.slice(1).reduce((sum, p, i) => sum + metres(line[i] as LngLat, p), 0);

/** Every stretch of the line, the first one running into the second point. */
export function stretchesOf(points: DrawnPoint[], roads: Roads): Stretch[] {
  return points.slice(1).map((p, i) => {
    const from = (points[i] as DrawnPoint).at;
    const way = wayOf(p);
    if (way === "road") {
      const road = roads.get(roadKey(from, p.at));
      // The road ends where it comes nearest. The stretch ends on its points.
      if (road)
        return {
          kind: "road",
          line: [from, ...road.line, p.at],
          m: road.m,
          s: road.s,
        };
      const line = [from, p.at];
      return {
        kind: road === null ? "none" : "wait",
        line,
        m: lengthOf(line),
        s: 0,
      };
    }
    const line = [from, ...(p.line ?? []), p.at];
    return { kind: way, line, m: lengthOf(line), s: 0 };
  });
}

/** The whole line, or null while a road is missing. */
export function pathOf(points: DrawnPoint[], roads: Roads): LngLat[] | null {
  const stretches = stretchesOf(points, roads);
  if (stretches.some((s) => s.kind === "wait" || s.kind === "none"))
    return null;
  return [
    (points[0] as DrawnPoint).at,
    ...stretches.flatMap((s) => s.line.slice(1)),
  ];
}

/**
 * The roads still to ask for: each a run of points whose stretches all go by
 * road, so one question covers the run.
 */
export function missingRuns(points: DrawnPoint[], roads: Roads): LngLat[][] {
  const runs: LngLat[][] = [];
  let run: LngLat[] = [];
  let open = false;
  const close = () => {
    if (open) runs.push(run);
    run = [];
    open = false;
  };
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1] as DrawnPoint, points[i] as DrawnPoint];
    if (!b.road || run.length >= 20) close();
    if (!b.road) continue;
    if (run.length === 0) run.push(a.at);
    run.push(b.at);
    if (!roads.has(roadKey(a.at, b.at))) open = true;
  }
  close();
  return runs;
}

/** The point of a line nearest to `at`, as its index. */
function nearest(line: LngLat[], at: LngLat) {
  let best = 0;
  for (let i = 1; i < line.length; i++) {
    if (metres(line[i] as LngLat, at) < metres(line[best] as LngLat, at))
      best = i;
  }
  return best;
}

/**
 * A new point on the stretch that runs into point `i`. Both halves keep the
 * stretch's way. A line drawn by hand is cut where it passes the new point.
 */
export function insertPoint(
  points: DrawnPoint[],
  i: number,
  at: LngLat,
): DrawnPoint[] {
  const old = points[i] as DrawnPoint;
  let added: DrawnPoint = { at, road: old.road };
  let after = old;
  if (old.line?.length) {
    const cut = nearest(old.line, at);
    added = { at, road: false, line: old.line.slice(0, cut) };
    after = { ...old, line: old.line.slice(cut + 1) };
  }
  return [...points.slice(0, i), added, after, ...points.slice(i + 1)];
}

export const movePoint = (
  points: DrawnPoint[],
  i: number,
  at: LngLat,
): DrawnPoint[] => points.map((p, k) => (k === i ? { ...p, at } : p));

/** Without point `i`. A line needs two points, so the last two stay. */
export function removePoint(points: DrawnPoint[], i: number): DrawnPoint[] {
  if (points.length <= 2) return points;
  const next = points[i + 1];
  const gone = points[i] as DrawnPoint;
  // Two lines drawn by hand that met in the point become one.
  const joined =
    next?.line?.length && gone.line?.length && i > 0
      ? [...gone.line, gone.at, ...next.line]
      : next?.line;
  return points.flatMap((p, k) =>
    k === i ? [] : k === i + 1 ? [{ ...p, line: joined }] : [p],
  );
}

/** Sets how the stretch into point `i` runs. By hand, it needs its line. */
export function setWay(
  points: DrawnPoint[],
  i: number,
  way: Way,
  line?: LngLat[],
): DrawnPoint[] {
  return points.map((p, k) =>
    k !== i
      ? p
      : way === "free"
        ? { at: p.at, road: false, line: line ?? [] }
        : { at: p.at, road: way === "road" },
  );
}

/** "152 km", "850 m"; "8,2 km" in German. */
export const km = (m: number, locale = "en") => {
  const text =
    m < 1000
      ? `${Math.round(m / 10) * 10} m`
      : `${m < 10_000 ? (m / 1000).toFixed(1) : Math.round(m / 1000)} km`;
  return locale === "de" ? text.replace(".", ",") : text;
};

/** "2 h 45", "35 min". */
export function hours(s: number) {
  const min = Math.round(s / 60);
  return min < 60
    ? `${min} min`
    : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}
