/**
 * The private trips, for someone signed in. The browser asks this site's
 * `/api/trips/private`, whose session cookie only the server can read; the
 * hint cookie next to it says whether asking is worth it, so a visitor's
 * browser asks nothing.
 */

import type { Trip, TripCard } from "./types";

/** Set at sign-in next to the session cookie; holds only "1". */
export const HINT_COOKIE = "trips_signed_in";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** True when the hint cookie says someone is signed in (`document.cookie`). */
export function hasHint(cookie: string): boolean {
  return cookie.split(";").some((part) => part.trim() === `${HINT_COOKIE}=1`);
}

/** Sign in, then come back to `returnTo`. */
export function signInHref(returnTo: string): string {
  return `/auth/login?next=${encodeURIComponent(returnTo)}`;
}

/** The form action that signs out. */
export const signOutAction = (): string => "/auth/logout";

export type PrivateCard = TripCard & { public: boolean };

export type Reading<T> =
  | { state: "out" }
  | { state: "error" }
  | ({ state: "in" } & T);

async function ask<T>(path: string): Promise<Reading<{ body: T }>> {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (res.status === 401) return { state: "out" };
    if (!res.ok) return { state: "error" };
    return { state: "in", body: (await res.json()) as T };
  } catch {
    return { state: "error" };
  }
}

/** Who is signed in and every trip they may see. */
export async function readPrivateTrips(): Promise<
  Reading<{ name: string; trips: PrivateCard[] }>
> {
  const got = await ask<{ name: string; trips: PrivateCard[] }>(
    "/api/trips/private",
  );
  return got.state === "in" ? { state: "in", ...got.body } : got;
}

/** One trip, private or open; "error" also covers an unknown slug. */
export async function readPrivateTrip(
  slug: string,
): Promise<Reading<{ trip: Trip }>> {
  if (!SLUG.test(slug)) return { state: "error" };
  const got = await ask<{ trip: Trip }>(`/api/trips/private/${slug}`);
  return got.state === "in" ? { state: "in", trip: got.body.trip } : got;
}
