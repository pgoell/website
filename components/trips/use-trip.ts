"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOOK, isLook, LOOK_KEY, type Look } from "@/lib/trips/look";
import { chaptersOf, dayPlan, daysBetween } from "@/lib/trips/plan";
import type { LngLat, Trip } from "@/lib/trips/types";

/** Below this width the map, the days and the card stack. Same number as in trips.module.css. */
const NARROW = "(max-width: 900px)";
/** How long a day stays up while the trip plays. */
const PLAY_MS = 2600;

/** Room the map keeps clear for what lies on it: the bar, the card and the days. */
const WIDE_PAD = { top: 200, right: 500, bottom: 220, left: 110 };
const NARROW_PAD = { top: 104, right: 56, bottom: 36, left: 56 };

function typing(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return (
    !!el &&
    (el.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))
  );
}

/**
 * One trip on screen: which day is picked, what the map shows, and the look.
 * While `busy` (a form, a pin or a line on the map), the arrow keys rest.
 */
export function useTrip(trip: Trip, busy = false) {
  const days = useMemo(
    () =>
      daysBetween(trip.startDate, trip.endDate).map((d) => dayPlan(trip, d)),
    [trip],
  );
  const chapters = useMemo(() => chaptersOf(trip, days), [trip, days]);
  const all = useMemo(
    () => trip.stops.map((s): LngLat => [s.lng, s.lat]),
    [trip],
  );

  /** The picked day, counted from 0, or null for the whole trip. */
  const [picked, setPicked] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [look, setLookState] = useState<Look>(DEFAULT_LOOK);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOOK_KEY);
      if (isLook(stored)) setLookState(stored);
    } catch {
      // No storage here. The default look stays.
    }
    const q = window.matchMedia(NARROW);
    const on = () => setNarrow(q.matches);
    on();
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);

  const setLook = useCallback((next: Look) => {
    setLookState(next);
    try {
      window.localStorage.setItem(LOOK_KEY, next);
    } catch {
      // The look still changes for this visit.
    }
  }, []);

  const last = days.length - 1;
  const step = useCallback(
    (by: number) =>
      setPicked((i) =>
        i === null ? (by > 0 ? 0 : last) : Math.min(last, Math.max(0, i + by)),
      ),
    [last],
  );
  const whole = useCallback(() => {
    setPicked(null);
    setPlaying(false);
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target) || busy)
        return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [step, busy]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(
      () =>
        setPicked((i) => {
          const next = i === null ? 0 : i + 1;
          if (next > last) {
            setPlaying(false);
            return null;
          }
          return next;
        }),
      PLAY_MS,
    );
    return () => clearInterval(t);
  }, [playing, last]);

  const day = picked === null ? undefined : days[picked];
  const focus = day?.points.length ? day.points : all;
  const lines = useMemo(
    () => day?.legs.filter((l) => l.mode === "ground").map((l) => l.path) ?? [],
    [day],
  );

  return {
    days,
    chapters,
    picked,
    day,
    /** The stop the picked day ends at. */
    mark: day?.stops.at(-1) ?? null,
    focus,
    lines,
    pad: narrow ? NARROW_PAD : WIDE_PAD,
    narrow,
    /** Every stop: the view of the whole trip. */
    all,
    look,
    setLook,
    playing,
    setPlaying,
    pick: setPicked,
    step,
    whole,
  };
}
