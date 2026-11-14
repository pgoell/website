import Link from "next/link";
import s from "@/components/site/site.module.css";
import { dayLabel, daysBetween } from "@/lib/trips/plan";
import type { TripCard } from "@/lib/trips/types";

/** One trip in the list of trips: index, name, stops, dates and a file name. */
export function TripRow({
  trip,
  locale,
  idx,
  file,
  to,
  days,
}: {
  trip: TripCard;
  locale: string;
  idx: string;
  file: string;
  /** The word between the two dates. */
  to: string;
  /** "16 days", already counted out. */
  days: (count: number) => string;
}) {
  return (
    <li>
      <Link href={`/${locale}/trips/${trip.slug}`} className={s.row}>
        <span className={s.idx}>{idx}</span>
        <div>
          <h2>{trip.name}</h2>
          {trip.stops.length > 0 && (
            <p className={s.ex}>{trip.stops.join(" → ")}</p>
          )}
        </div>
        <div className={s.meta}>
          {dayLabel(trip.startDate, locale)} {to}{" "}
          {dayLabel(trip.endDate, locale)} {trip.endDate.slice(0, 4)}
          <br />
          {days(daysBetween(trip.startDate, trip.endDate).length)}
          <span className={s.file}>{file}</span>
        </div>
      </Link>
    </li>
  );
}
