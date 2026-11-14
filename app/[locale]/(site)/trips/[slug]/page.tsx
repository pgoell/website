import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrivateTripPage, TripPage } from "@/components/trips/trip-page";
import { getTrip } from "@/lib/trips/feed";

type Props = { params: Promise<{ locale: string; slug: string }> };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const trip = await getTrip(slug);
  // a private trip renders in the browser only; keep its address out of search
  return trip ? { title: trip.name } : { robots: { index: false } };
}

export default async function TripRoute({ params }: Props) {
  const { locale, slug } = await params;
  if (!SLUG.test(slug)) notFound();
  const trip = await getTrip(slug);
  // not in the open feed: maybe a private trip, which only the browser may ask for
  if (!trip) return <PrivateTripPage slug={slug} locale={locale} />;
  return <TripPage trip={trip} locale={locale} />;
}
