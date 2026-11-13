import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FrameTitle } from "@/components/frame/frame-title";
import s from "@/components/site/site.module.css";
import { getTrips } from "@/lib/trips/feed";
import { dayLabel, daysBetween } from "@/lib/trips/plan";

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
          {trips.map((trip, i) => {
            const n = trips.length - i;
            return (
              <li key={trip.slug}>
                <Link href={`/${locale}/trips/${trip.slug}`} className={s.row}>
                  <span className={s.idx}>{String(n).padStart(3, "0")}</span>
                  <div>
                    <h2>{trip.name}</h2>
                    {trip.stops.length > 0 && (
                      <p className={s.ex}>{trip.stops.join(" → ")}</p>
                    )}
                  </div>
                  <div className={s.meta}>
                    {dayLabel(trip.startDate, locale)} {t("to")}{" "}
                    {dayLabel(trip.endDate, locale)} {trip.endDate.slice(0, 4)}
                    <br />
                    {t("days", {
                      count: daysBetween(trip.startDate, trip.endDate).length,
                    })}
                    <span className={s.file}>{fileName(n)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className={s.empty}>{t("empty")}</p>
      )}
    </>
  );
}
