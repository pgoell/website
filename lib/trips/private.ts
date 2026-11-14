/**
 * The private trips, for Pascal once he is signed in to the trips app. The
 * browser asks trips.pgoell.com itself: both hosts are the same site, so the
 * trips app's session cookie rides along, and this site's server never sees a
 * private trip. Nothing here runs on the server.
 */

import { TRIPS_APP, toTrip, toTripCard } from "./feed";
import type { Trip, TripCard } from "./types";

/** Set by the trips app on pgoell.com at sign-in; holds only "1". */
export const HINT_COOKIE = "trips_signed_in";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Where the browser finds the trips app; overridable for local work. */
export const tripsBase = (): string =>
  process.env.NEXT_PUBLIC_TRIPS_URL ?? TRIPS_APP;

/** True when the trips app says someone is signed in (`document.cookie`). */
export function hasHint(cookie: string): boolean {
  return cookie.split(";").some((part) => part.trim() === `${HINT_COOKIE}=1`);
}

/** Sign in at the trips app, then come back to `returnTo`. */
export function signInHref(returnTo: string): string {
  return `${tripsBase()}/auth/login?next=${encodeURIComponent(returnTo)}`;
}

/** The form action that signs out of the trips app and this site. */
export const signOutAction = (): string => `${tripsBase()}/auth/logout`;

export type PrivateCard = TripCard & { public: boolean };

export type Reading<T> =
  | { state: "out" }
  | { state: "error" }
  | ({ state: "in" } & T);

const obj = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;

/** The body of `GET /api/private/trips`, or null when it is malformed. */
export function toPrivateList(
  raw: unknown,
): { name: string; trips: PrivateCard[] } | null {
  const r = obj(raw);
  const name = typeof r?.name === "string" ? r.name.trim() : "";
  if (!r || !name || !Array.isArray(r.trips)) return null;
  const trips = r.trips.flatMap((t) => {
    const card = toTripCard(t);
    return card ? [{ ...card, public: obj(t)?.public === true }] : [];
  });
  return { name, trips };
}

/** The body of `GET /api/private/trips/{slug}`, or null. */
export function toPrivateTrip(raw: unknown, slug: string): Trip | null {
  const trip = toTrip(obj(raw)?.trip);
  return trip?.slug === slug ? trip : null;
}

async function ask(path: string): Promise<Reading<{ body: unknown }>> {
  try {
    const res = await fetch(`${tripsBase()}${path}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (res.status === 401) return { state: "out" };
    if (!res.ok) return { state: "error" };
    return { state: "in", body: await res.json() };
  } catch {
    return { state: "error" };
  }
}

/** Who is signed in and every trip they may see. */
export async function readPrivateTrips(): Promise<
  Reading<{ name: string; trips: PrivateCard[] }>
> {
  const got = await ask("/api/private/trips");
  if (got.state !== "in") return got;
  const list = toPrivateList(got.body);
  return list ? { state: "in", ...list } : { state: "error" };
}

/** One trip, private or open; "error" also covers an unknown slug. */
export async function readPrivateTrip(
  slug: string,
): Promise<Reading<{ trip: Trip }>> {
  if (!SLUG.test(slug)) return { state: "error" };
  const got = await ask(`/api/private/trips/${slug}`);
  if (got.state !== "in") return got;
  const trip = toPrivateTrip(got.body, slug);
  return trip ? { state: "in", trip } : { state: "error" };
}
