import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TripView } from "@/components/trips/trip-view";
import { getTrip, TRIPS_APP } from "@/lib/trips/feed";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const trip = await getTrip(slug);
  return trip ? { title: trip.name } : {};
}

export default async function TripPage({ params }: Props) {
  const { locale, slug } = await params;
  const trip = await getTrip(slug);
  if (!trip) notFound();

  return (
    <TripView
      trip={trip}
      locale={locale}
      planner={`${TRIPS_APP}/${trip.slug}`}
    />
  );
}
