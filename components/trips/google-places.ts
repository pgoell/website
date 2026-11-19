"use client";

import type { Kind } from "@/lib/trips/pick";
import { KINDS, PER_SEARCH } from "@/lib/trips/pick";
import { load } from "./google-place";

/*
 * Google's places, asked from the browser with the page's Maps key, the same
 * key the place card uses. What Google shows lives in this tab only: the
 * server keeps a place's ID and, for 30 days, its coordinates.
 */

/** What a swipe card shows of a place. */
export type PlaceInfo = {
  id: string;
  name: string;
  type: string | null;
  lat: number;
  lng: number;
  rating: number | null;
  reviews: number | null;
  summary: string | null;
  photo: string | null;
  /** Who took the photo, which Google asks us to show. */
  photoBy: { name: string; uri: string | null } | null;
  mapsUri: string | null;
  /** Fetched with everything a card shows, not only the name and pin. */
  full: boolean;
};

type LatLng = { lat(): number; lng(): number };
type Photo = {
  getURI(o: { maxWidth?: number; maxHeight?: number }): string;
  authorAttributions?: { displayName: string; uri: string | null }[];
};
type GPlace = {
  id: string;
  displayName?: string | null;
  location?: LatLng | null;
  primaryTypeDisplayName?: string | null;
  rating?: number | null;
  userRatingCount?: number | null;
  editorialSummary?: string | null;
  photos?: Photo[];
  googleMapsURI?: string | null;
  fetchFields(o: { fields: string[] }): Promise<unknown>;
};
type PlacesLib = {
  Place: {
    new (o: { id: string }): GPlace;
    searchNearby(r: {
      fields: string[];
      locationRestriction: {
        center: { lat: number; lng: number };
        radius: number;
      };
      includedPrimaryTypes: string[];
      maxResultCount: number;
    }): Promise<{ places: GPlace[] }>;
  };
};

/** Everything a card shows. One search or lookup with these is one billed call. */
const FULL = [
  "id",
  "displayName",
  "location",
  "primaryTypeDisplayName",
  "rating",
  "userRatingCount",
  "editorialSummary",
  "photos",
  "googleMapsURI",
];
/** Enough for a list and the map: cheaper. */
const LIGHT = ["id", "displayName", "location", "primaryTypeDisplayName"];

const cache = new Map<string, PlaceInfo>();

function info(p: GPlace, full: boolean): PlaceInfo | null {
  if (!p.location) return null;
  const photo = full ? p.photos?.[0] : undefined;
  const by = photo?.authorAttributions?.[0];
  return {
    id: p.id,
    name: p.displayName ?? "",
    type: p.primaryTypeDisplayName ?? null,
    lat: p.location.lat(),
    lng: p.location.lng(),
    rating: p.rating ?? null,
    reviews: p.userRatingCount ?? null,
    summary: p.editorialSummary ?? null,
    photo: photo ? photo.getURI({ maxWidth: 900, maxHeight: 900 }) : null,
    photoBy: by ? { name: by.displayName, uri: by.uri ?? null } : null,
    mapsUri: p.googleMapsURI ?? null,
    full,
  };
}

const lib = (key: string) => load(key) as Promise<PlacesLib>;

/** What we already have of a place, if anything. */
export const known = (id: string): PlaceInfo | undefined => cache.get(id);

/**
 * The places of one kind around a point, most popular first. A list of types
 * Google refuses is tried again with the first type alone.
 */
export async function searchNear(
  key: string,
  center: { lat: number; lng: number },
  radius: number,
  kind: Kind,
): Promise<PlaceInfo[]> {
  const { Place } = await lib(key);
  const ask = (types: string[]) =>
    Place.searchNearby({
      fields: FULL,
      locationRestriction: { center, radius },
      includedPrimaryTypes: types,
      maxResultCount: PER_SEARCH,
    });
  const types = [...KINDS[kind]];
  let found: { places: GPlace[] };
  try {
    found = await ask(types);
  } catch (err) {
    if (types.length === 1) throw err;
    found = await ask(types.slice(0, 1));
  }
  const out: PlaceInfo[] = [];
  for (const p of found.places) {
    const i = info(p, true);
    if (!i) continue;
    cache.set(i.id, i);
    out.push(i);
  }
  return out;
}

/** One place, from the cache or from Google. Null when Google has no such place. */
export async function lookUp(
  key: string,
  id: string,
  full: boolean,
): Promise<PlaceInfo | null> {
  const have = cache.get(id);
  if (have && (have.full || !full)) return have;
  const { Place } = await lib(key);
  const p = new Place({ id });
  try {
    await p.fetchFields({ fields: full ? FULL : LIGHT });
  } catch {
    return null;
  }
  const i = info(p, full);
  if (i) cache.set(id, i);
  return i;
}
