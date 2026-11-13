"use client";

import { useMemo, useState } from "react";
import { cx } from "@/components/viewfinder/cx";
import { dayLabel, dayPlan, daysBetween, zoneName } from "@/lib/trips/plan";
import type { LngLat, Trip, TripLeg } from "@/lib/trips/types";
import { TripMap } from "./trip-map";
import s from "./trips.module.css";

export interface TripLabels {
  map: string;
  noMap: string;
  wholeTrip: string;
  showDay: string;
  inTheAir: string;
  day: string;
}

function LegRow({ leg, locale }: { leg: TripLeg; locale: string }) {
  return (
    <div className={s.leg}>
      <p className={s.legTitle}>
        <span aria-hidden="true">{leg.mode === "flight" ? "✈" : "→"}</span>{" "}
        {leg.title}
      </p>
      {leg.how && <p>{leg.how}</p>}
      {/* A leg without clock times shows none. Every time names its place. */}
      {leg.leave && (
        <p className={s.dim}>
          {leg.leave} {zoneName(leg.leaveTz)} → {leg.arrive}{" "}
          {zoneName(leg.arriveTz)}
          {leg.arriveDate !== leg.leaveDate &&
            `, ${dayLabel(leg.arriveDate, locale)}`}
        </p>
      )}
      {leg.note && <p className={s.dim}>{leg.note}</p>}
    </div>
  );
}

/** One open trip: the map, and beside it the days. A picked day moves the map. */
export function TripView({
  trip,
  locale,
  labels,
}: {
  trip: Trip;
  locale: string;
  labels: TripLabels;
}) {
  const days = useMemo(
    () =>
      daysBetween(trip.startDate, trip.endDate).map((d) => dayPlan(trip, d)),
    [trip],
  );
  const all = useMemo(
    () => trip.stops.map((p): LngLat => [p.lng, p.lat]),
    [trip],
  );
  const [picked, setPicked] = useState<string | null>(null);
  const day = days.find((d) => d.date === picked);
  const focus = day?.points.length ? day.points : all;
  const lines = useMemo(
    () => day?.legs.filter((l) => l.mode === "ground").map((l) => l.path) ?? [],
    [day],
  );

  return (
    <div className={s.trip}>
      <div className={s.mapBox}>
        <TripMap
          trip={trip}
          picked={lines}
          focus={focus}
          label={labels.map}
          broken={labels.noMap}
        />
        {picked && (
          <button
            type="button"
            className={s.whole}
            onClick={() => setPicked(null)}
          >
            ◂ {labels.wholeTrip}
          </button>
        )}
      </div>

      <ol className={s.days}>
        {days.map((d, i) => {
          const on = d.date === picked;
          const body =
            d.legs.length > 0 || d.note !== null || d.places.length > 0;
          return (
            <li key={d.date} className={cx(s.day, on && s.on)}>
              <button
                type="button"
                className={s.dayHead}
                aria-pressed={on}
                title={labels.showDay}
                onClick={() => setPicked(on ? null : d.date)}
              >
                <span className={s.n}>
                  <span className={s.sr}>{labels.day} </span>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <strong>{dayLabel(d.date, locale)}</strong>
                <span className={s.where}>
                  {d.stops.map((p) => p.name).join(" → ") || labels.inTheAir}
                </span>
              </button>
              {body && (
                <div className={s.dayBody}>
                  {d.legs.map((l) => (
                    <LegRow
                      key={`${l.leaveDate} ${l.title}`}
                      leg={l}
                      locale={locale}
                    />
                  ))}
                  {d.note && <p className={s.note}>{d.note}</p>}
                  {d.places.length > 0 && (
                    <ul className={s.places}>
                      {d.places.map((p) => (
                        <li key={p.name}>
                          {p.url ? (
                            <a href={p.url} target="_blank" rel="noreferrer">
                              {p.name}
                            </a>
                          ) : (
                            p.name
                          )}
                          {p.note && <span className={s.dim}> {p.note}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
