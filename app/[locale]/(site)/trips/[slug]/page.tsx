import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FrameTitle } from "@/components/frame/frame-title";
import site from "@/components/site/site.module.css";
import { TripView } from "@/components/trips/trip-view";
import s from "@/components/trips/trips.module.css";
import { getTrip, TRIPS_APP } from "@/lib/trips/feed";
import { dayLabel, daysBetween } from "@/lib/trips/plan";

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
  const t = await getTranslations("site.trips");
  const days = daysBetween(trip.startDate, trip.endDate).length;

  return (
    <>
      <Link href={`/${locale}/trips`} className={site.up}>
        ◂ {t("up")}
      </Link>
      <FrameTitle
        title={trip.name}
        sub={`${dayLabel(trip.startDate, locale)} ${t("to")} ${dayLabel(trip.endDate, locale)} · ${t("days", { count: days })} · ${t("stops", { count: trip.stops.length })}`}
      />
      <TripView
        trip={trip}
        locale={locale}
        labels={{
          map: t("map"),
          noMap: t("noMap"),
          wholeTrip: t("wholeTrip"),
          showDay: t("showDay"),
          inTheAir: t("inTheAir"),
          day: t("day"),
        }}
      />
      <p className={s.small}>
        <a href={`${TRIPS_APP}/${trip.slug}`}>{t("planner")}</a>
        {locale !== "en" && ` · ${t("language")}`}
      </p>
    </>
  );
}
