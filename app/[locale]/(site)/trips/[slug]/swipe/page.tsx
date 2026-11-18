import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { PickView } from "@/components/trips/pick-view";
import { readSession, SESSION_COOKIE } from "@/lib/trips/auth";
import { db, getStoredTrip } from "@/lib/trips/db";
import { tripIdOf } from "@/lib/trips/edit";
import { loadPick } from "@/lib/trips/pick-db";

type Props = { params: Promise<{ locale: string; slug: string }> };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const metadata: Metadata = { robots: { index: false } };

/** Swipe: only for someone signed in, on any of their trips. */
export default async function SwipeRoute({ params }: Props) {
  const { locale, slug } = await params;
  if (!SLUG.test(slug)) notFound();
  const user = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) {
    redirect(
      `/auth/login?next=${encodeURIComponent(`/${locale}/trips/${slug}/swipe`)}`,
    );
  }
  const trip = await getStoredTrip(slug);
  if (!trip) notFound();
  const sql = await db();
  const tripId = await tripIdOf(sql, slug);
  if (!tripId) notFound();
  const state = await loadPick(sql, tripId, user, process.env.ALLOWED_EMAILS);
  // The pin starts on the first stop, where the trip begins.
  const first = trip.stops[0];
  const start = first
    ? { lat: first.lat, lng: first.lng }
    : { lat: 35.681, lng: 139.767 };
  return (
    <PickView
      slug={slug}
      tripName={trip.name}
      locale={locale}
      initial={state}
      mapsKey={process.env.GOOGLE_MAPS_KEY}
      start={start}
    />
  );
}
