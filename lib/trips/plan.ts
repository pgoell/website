/** Pure helpers for showing a trip: its days, what happens on each, and dates as text. */

import type { LngLat, Trip, TripLeg, TripPlace, TripStop } from "./types";

/** Every day from `start` to `end`, both included, as YYYY-MM-DD. */
export function daysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  for (; d <= last; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

const WEEKDAYS: Record<string, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
};
const MONTHS: Record<string, string[]> = {
  en: "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" "),
  de: "Jan. Feb. März Apr. Mai Juni Juli Aug. Sep. Okt. Nov. Dez.".split(" "),
};

/**
 * "2026-08-22" to "Sat 22 Aug", or "Sa 22. Aug." in German. Built by hand:
 * Intl output differs between the server and browsers and breaks hydration.
 */
export function dayLabel(date: string, locale: string): string {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  const lang = locale in WEEKDAYS ? locale : "en";
  const week = (WEEKDAYS[lang] as string[])[d.getUTCDay()];
  const month = (MONTHS[lang] as string[])[d.getUTCMonth()];
  return lang === "de"
    ? `${week} ${d.getUTCDate()}. ${month}`
    : `${week} ${d.getUTCDate()} ${month}`;
}

/** "Africa/Dar_es_Salaam" to "Dar es Salaam": the place a clock time belongs to. */
export const zoneName = (tz: string): string =>
  (tz.split("/").at(-1) ?? tz).replace(/_/g, " ");

export interface DayPlan {
  date: string;
  /** Where the night before or the night after is spent. */
  stops: TripStop[];
  legs: TripLeg[];
  places: TripPlace[];
  note: string | null;
  /** Everything of the day that has a place on the map. */
  points: LngLat[];
}

export function dayPlan(trip: Trip, date: string): DayPlan {
  const stops = trip.stops.filter((s) => s.arrive <= date && date <= s.depart);
  const legs = trip.legs.filter((l) => l.leaveDate === date);
  const places = trip.places
    .filter((p) => p.day === date)
    .sort((a, b) => (a.dayOrder ?? 1e9) - (b.dayOrder ?? 1e9));
  const points: LngLat[] = [
    ...legs.filter((l) => l.mode === "ground").flatMap((l) => l.path),
    ...places.flatMap((p): LngLat[] =>
      p.lng !== null && p.lat !== null ? [[p.lng, p.lat]] : [],
    ),
  ];
  if (points.length === 0) {
    points.push(...stops.map((s): LngLat => [s.lng, s.lat]));
  }
  return {
    date,
    stops,
    legs,
    places,
    note: trip.dayNotes[date] ?? null,
    points,
  };
}

/** Points along the great circle from a to b, so a flight draws as an arc. */
export function arc(a: LngLat, b: LngLat, steps = 64): LngLat[] {
  const rad = Math.PI / 180;
  const [l1, p1, l2, p2] = [a[0] * rad, a[1] * rad, b[0] * rad, b[1] * rad];
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((p2 - p1) / 2) ** 2 +
          Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2,
      ),
    );
  if (d === 0) return [a, b];
  return Array.from({ length: steps + 1 }, (_, i): LngLat => {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
    return [Math.atan2(y, x) / rad, Math.atan2(z, Math.hypot(x, y)) / rad];
  });
}

/** "2.81S 35.66E": a coordinate as the viewfinder shows the town's. */
export function coords(lat: number, lng: number): string {
  const part = (v: number, pos: string, neg: string) =>
    `${Math.abs(v).toFixed(2)}${v >= 0 ? pos : neg}`;
  return `${part(lat, "N", "S")} ${part(lng, "E", "W")}`;
}
