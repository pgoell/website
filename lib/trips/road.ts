import { simplify } from "./geo";
import { type Road, roadKey } from "./route";
import type { LngLat } from "./types";

// The roads come from the public OSRM server of FOSSGIS, which asks for at
// most one request a second. Every answer is kept, so a route that is opened
// or saved again asks nobody.
const kept = new Map<string, Road | null>();
const MOST_KEPT = 2000;
const GAP = 1000;
let line: Promise<unknown> = Promise.resolve();
let last = 0;

type Answer = {
  code: string;
  routes?: {
    legs: {
      distance: number;
      duration: number;
      steps: { geometry: { coordinates: LngLat[] } }[];
    }[];
  }[];
};

/** One request at a time, a second apart. */
function ask(through: LngLat[]): Promise<Answer> {
  const turn = line.then(async () => {
    const wait = last + GAP - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${through
        .map((p) => p.join(","))
        .join(";")}?overview=false&steps=true&geometries=geojson`,
      {
        headers: { "User-Agent": "pgoell.com trips, a route drawn by hand" },
        signal: AbortSignal.timeout(20_000),
      },
    );
    return (await res.json()) as Answer;
  });
  line = turn.catch(() => {});
  return turn;
}

function keep(a: LngLat, b: LngLat, road: Road | null) {
  if (kept.size >= MOST_KEPT) kept.delete(kept.keys().next().value as string);
  kept.set(roadKey(a, b), road);
}

/**
 * The road for each stretch between the given points, null where the router
 * finds none. Throws when the router cannot be reached.
 */
export async function roadsThrough(
  through: LngLat[],
): Promise<(Road | null)[]> {
  const known = () =>
    through.slice(1).map((b, i) => kept.get(roadKey(through[i] as LngLat, b)));
  if (known().every((r) => r !== undefined)) return known() as (Road | null)[];

  const answer = await ask(through);
  const legs = answer.routes?.[0]?.legs;
  if (answer.code === "Ok" && legs?.length === through.length - 1) {
    legs.forEach((leg, i) => {
      const all = leg.steps.flatMap((s) => s.geometry.coordinates);
      keep(through[i] as LngLat, through[i + 1] as LngLat, {
        line: all.length ? simplify(all) : [],
        m: leg.distance,
        s: leg.duration,
      });
    });
  } else if (answer.code === "NoRoute" || answer.code === "NoSegment") {
    if (through.length === 2) {
      keep(through[0] as LngLat, through[1] as LngLat, null);
    } else {
      // One stretch of several has no road. Ask for each to learn which.
      for (let i = 1; i < through.length; i++) {
        await roadsThrough([through[i - 1] as LngLat, through[i] as LngLat]);
      }
    }
  } else {
    throw new Error(`router: ${answer.code}`);
  }
  return known() as (Road | null)[];
}
