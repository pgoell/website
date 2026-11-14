import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FrameTitle } from "@/components/frame/frame-title";
import s from "@/components/site/site.module.css";
import { TripRow } from "@/components/trips/trip-row";
import { PrivateTrips } from "@/components/trips/trips-account";
import { getTrips } from "@/lib/trips/feed";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site.trips");
  return { title: t("title"), description: t("subtitle") };
}

/** Camera-style file name for the nth trip: TRIP0001.GPX. */
const fileName = (n: number) => `TRIP${String(n).padStart(4, "0")}.GPX`;

export default async function TripsIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("site.trips");
  const trips = await getTrips();

  return (
    <>
      <FrameTitle
        title={t("title")}
        sub={`${t("subtitle")} · ${t("count", { count: trips.length })}`}
      />
      {trips.length ? (
        <ol className={s.list}>
          {trips.map((trip, i) => (
            <TripRow
              key={trip.slug}
              trip={trip}
              locale={locale}
              idx={String(trips.length - i).padStart(3, "0")}
              file={fileName(trips.length - i)}
              to={t("to")}
              days={(count) => t("days", { count })}
            />
          ))}
        </ol>
      ) : (
        <p className={s.empty}>{t("empty")}</p>
      )}
      <PrivateTrips locale={locale} />
    </>
  );
}
