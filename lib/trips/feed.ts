/** The open trips, read from the trips app at trips.pgoell.com. */

import type {
  LngLat,
  Trip,
  TripCard,
  TripLeg,
  TripPlace,
  TripStop,
} from "./types";

const TEN_MINUTES = 600;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Where the trips app lives, for links to the full planner. */
export const TRIPS_APP = "https://trips.pgoell.com";

type Raw = Record<string, unknown>;

const obj = (v: unknown): Raw | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Raw) : null;
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const text = (v: unknown): string | null => str(v)?.trim() || null;
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const date = (v: unknown): string | null => {
  const s = str(v);
  return s && DATE.test(s) ? s : null;
};

function point(v: unknown): LngLat | null {
  if (!Array.isArray(v) || v.length < 2) return null;
  const lng = num(v[0]);
  const lat = num(v[1]);
  if (lng === null || lat === null) return null;
  return Math.abs(lng) <= 180 && Math.abs(lat) <= 90 ? [lng, lat] : null;
}

/** Keeps the well-formed entries of a list and drops the rest. */
function list<T>(v: unknown, one: (raw: unknown) => T | null): T[] {
  return Array.isArray(v) ? v.map(one).filter((x): x is T => x !== null) : [];
}

function toHead(raw: unknown) {
  const r = obj(raw);
  const slug = text(r?.slug);
  const name = text(r?.name);
  const startDate = date(r?.startDate);
  const endDate = date(r?.endDate);
  if (!slug || !SLUG.test(slug) || !name || !startDate || !endDate) return null;
  // A trip that ends before it starts, or runs for years, is a broken entry.
  const days = (Date.parse(endDate) - Date.parse(startDate)) / 86_400_000;
  return days >= 0 && days <= 366 ? { slug, name, startDate, endDate } : null;
}

/** One entry of `GET /api/trips`, or null when it is malformed. */
export function toTripCard(raw: unknown): TripCard | null {
  const head = toHead(raw);
  if (!head) return null;
  return { ...head, stops: list(obj(raw)?.stops, text) };
}

function toStop(raw: unknown): TripStop | null {
  const r = obj(raw);
  const at = point([r?.lng, r?.lat]);
  const position = num(r?.position);
  const name = text(r?.name);
  const arrive = date(r?.arrive);
  const depart = date(r?.depart);
  if (!at || position === null || !name || !arrive || !depart) return null;
  return {
    position,
    name,
    tz: text(r?.tz) ?? "UTC",
    lng: at[0],
    lat: at[1],
    arrive,
    depart,
  };
}

function toLeg(raw: unknown): TripLeg | null {
  const r = obj(raw);
  const mode = r?.mode;
  const title = text(r?.title);
  const leaveDate = date(r?.leaveDate);
  const path = list(r?.path, point);
  if ((mode !== "flight" && mode !== "ground") || !title || !leaveDate)
    return null;
  if (path.length < 2) return null;
  return {
    mode,
    title,
    how: text(r?.how) ?? "",
    leaveDate,
    leave: text(r?.leave) ?? "",
    leaveTz: text(r?.leaveTz) ?? "UTC",
    arriveDate: date(r?.arriveDate) ?? leaveDate,
    arrive: text(r?.arrive) ?? "",
    arriveTz: text(r?.arriveTz) ?? "UTC",
    note: text(r?.note),
    path,
  };
}

function toPlace(raw: unknown): TripPlace | null {
  const r = obj(raw);
  const name = text(r?.name);
  if (!name) return null;
  const at = point([r?.lng, r?.lat]);
  const url = text(r?.url);
  return {
    name,
    // Only web links: the text comes from a form in the trips app.
    url: url && /^https?:\/\//.test(url) ? url : null,
    note: text(r?.note),
    tags: text(r?.tags),
    day: date(r?.day),
    dayOrder: num(r?.dayOrder),
    lng: at ? at[0] : null,
    lat: at ? at[1] : null,
  };
}

/** The trip of `GET /api/trips/{slug}`, or null when it is malformed. */
export function toTrip(raw: unknown): Trip | null {
  const head = toHead(raw);
  const r = obj(raw);
  if (!head || !r) return null;
  const stops = list(r.stops, toStop).sort((a, b) => a.position - b.position);
  if (stops.length === 0) return null;
  const dayNotes: Record<string, string> = {};
  for (const [day, note] of Object.entries(obj(r.dayNotes) ?? {})) {
    const words = text(note);
    if (DATE.test(day) && words) dayNotes[day] = words;
  }
  return {
    ...head,
    stops,
    legs: list(r.legs, toLeg),
    places: list(r.places, toPlace),
    dayNotes,
  };
}

async function trips(path: string): Promise<unknown> {
  try {
    const res = await fetch(new URL(path, process.env.TRIPS_URL ?? TRIPS_APP), {
      next: { revalidate: TEN_MINUTES },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      console.error(`Trips feed failed: ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("Trips feed failed:", err);
    return null;
  }
}

/** The open trips, newest first; none when the trips app does not answer. */
export async function getTrips(): Promise<TripCard[]> {
  const raw = obj(await trips("/api/trips"));
  return list(raw?.trips, toTripCard);
}

/** One open trip, or null. */
export async function getTrip(slug: string): Promise<Trip | null> {
  if (!SLUG.test(slug)) return null;
  const raw = obj(await trips(`/api/trips/${slug}`));
  const trip = toTrip(raw?.trip);
  return trip?.slug === slug ? trip : null;
}
