/** Pure helpers for the places of a trip, as someone signed in works with them. */

import { metres } from "./geo";
import type {
  LngLat,
  PlaceStatus,
  StoredPlace,
  StoredStop,
  StoredTrip,
} from "./types";

/** A place as the form sends it: new without an id. */
export type PlaceInput = Omit<
  StoredPlace,
  "id" | "createdBy" | "googlePlaceId" | "dayOrder"
> & { id?: number };

export const blank = (status: PlaceStatus): PlaceInput => ({
  name: "",
  url: null,
  note: null,
  tags: null,
  day: null,
  lat: null,
  lng: null,
  status,
});

export const pin = (p: { lat: number | null; lng: number | null }): LngLat[] =>
  p.lat !== null && p.lng !== null ? [[p.lng, p.lat]] : [];

/** A web link, or null: the text comes from a form. */
export const webLink = (url: string | null): string | null =>
  url && /^https?:\/\//i.test(url) ? url : null;

export function nearestStop(
  stops: StoredStop[],
  p: { lat: number | null; lng: number | null },
): StoredStop | undefined {
  if (p.lat === null || p.lng === null || stops.length === 0) return undefined;
  const { lat, lng } = p;
  const dist = (s: StoredStop) => (s.lat - lat) ** 2 + (s.lng - lng) ** 2;
  return stops.reduce((a, b) => (dist(b) < dist(a) ? b : a));
}

/**
 * One day as a route: from the hotel through the day's places in their order
 * and back, as straight lines. A day with two hotels gets one round for each.
 */
export function dayRoute(trip: StoredTrip, date: string) {
  const stops = trip.stops.filter((s) => s.arrive <= date && date <= s.depart);
  const places = trip.places
    .filter((p) => p.day === date)
    .sort((a, b) => (a.dayOrder ?? 1e9) - (b.dayOrder ?? 1e9) || a.id - b.id);
  /** Metres to each place from the one before it, or from the hotel. */
  const steps = new Map<number, number>();
  const lines = stops
    .map((s) => {
      const hotel: LngLat = [s.lng, s.lat];
      const line = [hotel];
      for (const p of places) {
        if (p.lat === null || p.lng === null || nearestStop(stops, p) !== s) {
          continue;
        }
        steps.set(p.id, metres(line.at(-1) as LngLat, [p.lng, p.lat]));
        line.push([p.lng, p.lat]);
      }
      return [...line, hotel];
    })
    .filter((line) => line.length > 2);
  return { stops, places, lines, steps };
}

/** The places by the stop they lie nearest to; null for those without a pin. */
export function groupByStop(
  stops: StoredStop[],
  places: StoredPlace[],
): [string | null, StoredPlace[]][] {
  const groups = new Map<string | null, StoredPlace[]>();
  for (const s of stops) groups.set(s.name, []);
  groups.set(null, []);
  for (const p of places) {
    groups.get(nearestStop(stops, p)?.name ?? null)?.push(p);
  }
  return [...groups].filter(([, list]) => list.length > 0);
}

/** A stop the day works without: it carries the tag "optional". */
export const optional = (p: StoredPlace) =>
  p.tags?.split(",").some((t) => t.trim() === "optional") ?? false;

/** Every word of the filter must be in the name, the tags or the notes. */
export function filterPlaces(places: StoredPlace[], filter: string) {
  const words = filter.toLowerCase().split(/\s+/).filter(Boolean);
  return places.filter((p) => {
    const hay = `${p.name} ${p.tags ?? ""} ${p.note ?? ""}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/** Stored as a place's Google ID when Google has no entry for it, or the wrong one. */
export const NO_GOOGLE = "none";

const GOOGLE_MAPS =
  /^https?:\/\/(maps\.app\.goo\.gl\/|goo\.gl\/maps|maps\.google\.[a-z.]+\/|(www\.)?google\.[a-z.]+\/maps)/;

export const isMapsLink = (url?: string | null): url is string =>
  !!url && GOOGLE_MAPS.test(url);

/**
 * A link that opens the place itself in Google Maps, with its photos and
 * reviews. A search for bare coordinates only drops a nameless pin.
 */
export function mapsLink(p: {
  name: string;
  url?: string | null;
  googlePlaceId?: string | null;
  lat: number | null;
  lng: number | null;
}) {
  if (isMapsLink(p.url)) return p.url;
  const name = encodeURIComponent(p.name);
  if (p.googlePlaceId && p.googlePlaceId !== NO_GOOGLE) {
    return `https://www.google.com/maps/search/?api=1&query=${name}&query_place_id=${encodeURIComponent(p.googlePlaceId)}`;
  }
  // The name, searched around the pin, so Google finds the right branch.
  const near =
    p.lat !== null && p.lng !== null ? `/@${p.lat},${p.lng},17z` : "";
  return `https://www.google.com/maps/search/${name}${near}`;
}
