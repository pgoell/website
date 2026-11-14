"use client";

import { unstable_isUnrecognizedActionError } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { drawLeg, type TripError } from "@/app/[locale]/(site)/trips/actions";
import {
  insertPoint,
  lengthOf,
  MOST_DRAWN,
  MOST_POINTS,
  missingRuns,
  movePoint,
  pathOf,
  type Road,
  removePoint,
  roadKey,
  round,
  setWay,
  stretchesOf,
  type Way,
} from "@/lib/trips/route";
import type { DrawnPoint, StoredLeg as Leg, LngLat } from "@/lib/trips/types";

/** What went wrong, as a key of `site.trips.error`. */
export type RouteError =
  | TripError
  | "roadsLookup"
  | "offlineRoute"
  | "updated"
  | "saveFailed";

const same = (a: DrawnPoint[], b: DrawnPoint[]) =>
  JSON.stringify(a) === JSON.stringify(b);

type Open = {
  leg: Leg;
  /** The points the editor opened with, and the length of the line then. */
  first: DrawnPoint[];
  was: number;
  points: DrawnPoint[];
  past: DrawnPoint[][];
  future: DrawnPoint[][];
  selected: number | null;
  /** A point held and moved: the line as it would be, not yet a step. */
  held: DrawnPoint[] | null;
  /** The stretch into this point waits to be drawn by hand. */
  byHand: number | null;
};

/**
 * A ground leg's line while it is bent on the map. Every change is a step
 * that can be undone, the roads are looked up as the line changes, and the
 * line is saved as soon as it stands.
 */
export function useRouteEdit(slug: string) {
  const [open, setOpen] = useState<Open | null>(null);
  const [roads, setRoads] = useState<Map<string, Road | null>>(new Map());
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<RouteError | null>(null);
  // Counts up to ask the router again after an answer or a failure.
  const [turn, setTurn] = useState(0);
  const busy = useRef(false);
  const asked = useRef(0);
  // What the server holds: the points saved last, or "first" for the line
  // the trip came with.
  const stored = useRef<string>("");

  const shown = open ? (open.held ?? open.points) : null;
  const dragging = open?.held != null;

  // The roads of the line as shown. While a point is held, at most one
  // question a second, which is what the public router allows.
  // biome-ignore lint/correctness/useExhaustiveDependencies: turn asks again
  useEffect(() => {
    if (!shown || busy.current) return;
    const run = missingRuns(shown, roads)[0];
    if (!run) return;
    const wait = dragging ? Math.max(0, asked.current + 1000 - Date.now()) : 0;
    const timer = setTimeout(async () => {
      busy.current = true;
      asked.current = Date.now();
      let again = 0;
      try {
        const res = await fetch(
          `/api/trips/road?through=${run.map((p) => round(p).join(",")).join(";")}`,
        );
        if (!res.ok) throw new Error(String(res.status));
        const { roads: found } = (await res.json()) as {
          roads: (Road | null)[];
        };
        setRoads((old) => {
          const next = new Map(old);
          found.forEach((road, i) => {
            next.set(roadKey(run[i] as LngLat, run[i + 1] as LngLat), road);
          });
          return next;
        });
        setError(null);
      } catch {
        setError("roadsLookup");
        again = 4000;
      }
      setTimeout(() => {
        busy.current = false;
        setTurn((t) => t + 1);
      }, again);
    }, wait);
    return () => clearTimeout(timer);
  }, [shown, roads, dragging, turn]);

  const stretches = useMemo(
    () => (shown ? stretchesOf(shown, roads) : []),
    [shown, roads],
  );

  // What should be on the server for the line as it stands. Back at the line
  // the editor opened with, a leg that was never drawn goes back to its own.
  const points = open?.points;
  const wanted = useMemo(() => {
    if (!open || !points) return null;
    if (same(points, open.first) && !open.leg.drawn) return "first";
    return pathOf(points, roads) ? JSON.stringify(points) : null;
  }, [open, points, roads]);

  const save = useCallback(
    async (leg: Leg, want: string) => {
      if (!navigator.onLine) {
        setError("offlineRoute");
        return false;
      }
      setSaving("saving");
      try {
        const failed = await drawLeg(
          slug,
          leg.leaveDate,
          leg.title,
          want === "first" ? [] : JSON.parse(want),
        );
        if (failed) {
          setError(failed.error);
          setSaving("idle");
          return false;
        }
        stored.current = want;
        setError(null);
        setSaving("saved");
        return true;
      } catch (e) {
        setError(
          unstable_isUnrecognizedActionError(e) ? "updated" : "saveFailed",
        );
        setSaving("idle");
        return false;
      }
    },
    [slug],
  );

  // Saved a moment after the last change, once every road is there.
  const leg = open?.leg;
  useEffect(() => {
    if (!leg || dragging || !wanted || wanted === stored.current) return;
    const timer = setTimeout(() => save(leg, wanted), 700);
    return () => clearTimeout(timer);
  }, [leg, dragging, wanted, save]);

  const step = (next: DrawnPoint[], selected: number | null = null) =>
    setOpen(
      (o) =>
        o && {
          ...o,
          points: next,
          past: [...o.past.slice(-99), o.points],
          future: [],
          held: null,
          byHand: null,
          selected,
        },
    );

  const start = (leg: Leg) => {
    const first: DrawnPoint[] = leg.points ?? [
      { at: leg.path[0] as LngLat, road: false },
      { at: leg.path.at(-1) as LngLat, road: true },
    ];
    stored.current = leg.points ? JSON.stringify(first) : "first";
    setError(null);
    setSaving("idle");
    setOpen({
      leg,
      first,
      was: lengthOf(leg.path),
      points: first,
      past: [],
      future: [],
      selected: null,
      held: null,
      byHand: null,
    });
  };

  /** Closes the editor, saving first what is not saved yet. */
  const done = () => {
    if (open && wanted && wanted !== stored.current) save(open.leg, wanted);
    setOpen(null);
  };

  /** Back to the line the trip came with. */
  const reset = async () => {
    if (!open) return;
    if (stored.current === "first" || (await save(open.leg, "first")))
      setOpen(null);
  };

  const undo = () =>
    setOpen((o) =>
      o?.past.length
        ? {
            ...o,
            points: o.past.at(-1) as DrawnPoint[],
            past: o.past.slice(0, -1),
            future: [o.points, ...o.future],
            selected: null,
            held: null,
            byHand: null,
          }
        : o,
    );
  const redo = () =>
    setOpen((o) =>
      o?.future.length
        ? {
            ...o,
            points: o.future[0] as DrawnPoint[],
            past: [...o.past, o.points],
            future: o.future.slice(1),
            selected: null,
            held: null,
            byHand: null,
          }
        : o,
    );

  const select = (i: number | null) =>
    setOpen((o) => o && { ...o, selected: o.selected === i ? null : i });

  /** A new point on the stretch into point `i`, held from now on. */
  const insert = (i: number, at: LngLat) =>
    setOpen((o) =>
      o && o.points.length < MOST_POINTS
        ? { ...o, held: insertPoint(o.points, i, round(at)), selected: null }
        : o,
    );
  const move = (i: number, at: LngLat) =>
    setOpen(
      (o) =>
        o && {
          ...o,
          held: movePoint(o.held ?? o.points, i, round(at)),
          selected: null,
        },
    );
  const drop = () => {
    if (open?.held) step(open.held);
  };

  const remove = (i: number) => {
    if (open) step(removePoint(open.points, i));
  };
  /** How the way runs on from point `i`. By hand, the line is drawn next. */
  const way = (i: number, to: Way) => {
    if (!open) return;
    if (to === "free") setOpen({ ...open, byHand: i + 1, selected: null });
    else step(setWay(open.points, i + 1, to), i);
  };
  /** The line drawn by hand for the stretch that waits for one. */
  const stroke = (line: LngLat[]) => {
    if (!open || open.byHand === null) return;
    if (line.length < 2) {
      setOpen({ ...open, byHand: null });
      return;
    }
    const thin = Math.ceil(line.length / MOST_DRAWN);
    step(
      setWay(
        open.points,
        open.byHand,
        "free",
        line.filter((_, k) => k % thin === 0).map(round),
      ),
    );
  };
  const cancelStroke = () => setOpen((o) => o && { ...o, byHand: null });

  const total = stretches.reduce((sum, s) => sum + s.m, 0);
  const drive = stretches.reduce((sum, s) => sum + s.s, 0);
  const state = !open
    ? null
    : {
        leg: open.leg,
        points: shown as DrawnPoint[],
        stretches,
        selected: open.selected,
        byHand: open.byHand,
        dragging,
        before: open.leg.path,
        m: total,
        s: drive,
        was: open.was,
        waiting: stretches.some((s) => s.kind === "wait"),
        noRoad: stretches.some((s) => s.kind === "none"),
        canUndo: open.past.length > 0,
        canRedo: open.future.length > 0,
        /** There is a drawn line to give up for the trip's own. */
        canReset: open.leg.drawn || stored.current !== "first",
        saving:
          wanted && wanted !== stored.current ? ("saving" as const) : saving,
        error,
      };

  return {
    state,
    start,
    done,
    reset,
    undo,
    redo,
    select,
    insert,
    move,
    drop,
    remove,
    way,
    stroke,
    cancelStroke,
  };
}

export type RouteEdit = ReturnType<typeof useRouteEdit>;
