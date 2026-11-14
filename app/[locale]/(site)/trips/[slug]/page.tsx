import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { TripEditor } from "@/components/trips/trip-edit";
import { PrivateTripPage, TripPage } from "@/components/trips/trip-page";
import { readSession, SESSION_COOKIE } from "@/lib/trips/auth";
import { getStoredTrip, getTrip } from "@/lib/trips/db";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ tab?: string }>;
};

/** The Trips phone app, linked from the trip pages only. */
const manifest = "/trips.webmanifest";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Someone signed in, read from the session cookie. The hint cookie proves nothing. */
async function signedIn() {
  return readSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const trip = await getTrip(slug);
  if (trip) return { title: trip.name, manifest };
  // a private trip: keep its address out of search
  const stored = (await signedIn()) ? await getStoredTrip(slug) : null;
  return {
    manifest,
    robots: { index: false },
    ...(stored && { title: stored.name }),
  };
}

export default async function TripRoute({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  if (!SLUG.test(slug)) notFound();
  const user = await signedIn();
  // Signed in: the whole trip, open or private, with everything to change it.
  const stored = user ? await getStoredTrip(slug) : null;
  if (user && stored) {
    return (
      <TripEditor
        trip={stored}
        locale={locale}
        userName={user.name}
        mapsKey={process.env.GOOGLE_MAPS_KEY}
        satellite={!!process.env.ARCGIS_API_KEY}
        openIdeas={(await searchParams).tab === "ideas"}
      />
    );
  }
  // A visitor: the open trip as `shownTrip` trims it, nothing more.
  const trip = await getTrip(slug);
  // not in the open feed: maybe a private trip, which only the browser may ask for
  if (!trip) return <PrivateTripPage slug={slug} locale={locale} />;
  return <TripPage trip={trip} locale={locale} />;
}
