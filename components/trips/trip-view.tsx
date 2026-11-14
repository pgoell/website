"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { cx } from "@/components/viewfinder/cx";
import { LOOKS } from "@/lib/trips/look";
import {
  type Chapter,
  type DayPlan,
  dayLabel,
  roadKm,
  zoneName,
} from "@/lib/trips/plan";
import type { Trip, TripLeg } from "@/lib/trips/types";
import { TripMap } from "./trip-map";
import s from "./trips.module.css";
import { useTrip } from "./use-trip";

type T = ReturnType<typeof useTranslations>;

const Plane = () => (
  <svg viewBox="0 0 24 24" className={s.ico} aria-hidden="true">
    <path d="M3 13.5 21 4l-5.5 17-3.6-7.2L3 13.5Z" />
  </svg>
);
const Road = () => (
  <svg viewBox="0 0 24 24" className={s.ico} aria-hidden="true">
    <circle cx="5" cy="18" r="2.2" />
    <circle cx="19" cy="6" r="2.2" />
    <path d="M7 18h7a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h7" />
  </svg>
);

const two = (n: number) => String(n).padStart(2, "0");
/** 1280 as "1,280", or "1.280" in German. By hand: Intl differs between server and browser. */
const grouped = (n: number, locale: string) =>
  String(n).replace(/\B(?=(\d{3})+$)/g, locale === "de" ? "." : ",");

const chapterName = (c: Chapter, t: T) =>
  c.stop ? c.stop.name : t(c.kind === "out" ? "out" : "home");

function Leg({ leg, locale }: { leg: TripLeg; locale: string }) {
  return (
    <div className={s.leg}>
      {leg.mode === "flight" ? <Plane /> : <Road />}
      <div>
        <p className={s.legTitle}>{leg.title}</p>
        {/* A leg without clock times shows none. Every time names its place. */}
        <p className={s.dim}>
          {leg.how}
          {leg.leave &&
            ` · ${leg.leave} ${zoneName(leg.leaveTz)} → ${leg.arrive} ${zoneName(leg.arriveTz)}${
              leg.arriveDate !== leg.leaveDate
                ? `, ${dayLabel(leg.arriveDate, locale)}`
                : ""
            }`}
        </p>
        {leg.note && <p className={s.dim}>{leg.note}</p>}
      </div>
    </div>
  );
}

function DayCard({
  day,
  index,
  total,
  locale,
  t,
}: {
  day: DayPlan;
  index: number;
  total: number;
  locale: string;
  t: T;
}) {
  return (
    <>
      <p className={s.kicker}>
        {t("day")} {two(index + 1)} <i>/ {total}</i>
      </p>
      <h2 className={s.big}>{dayLabel(day.date, locale)}</h2>
      <p className={s.where}>
        {day.stops.map((p) => p.name).join(" → ") || t("inTheAir")}
      </p>
      {day.note && <p className={s.note}>{day.note}</p>}
      {day.legs.map((l) => (
        <Leg key={`${l.leaveDate} ${l.title}`} leg={l} locale={locale} />
      ))}
      {day.places.length > 0 && (
        <ul className={s.places}>
          {day.places.map((p) => (
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
    </>
  );
}

/**
 * One open trip. The map is the page; the days lie on it as a strip, and one
 * day at a time shows in a card. On a narrow screen the card is swiped.
 */
export function TripView({
  trip,
  locale,
  planner,
}: {
  trip: Trip;
  locale: string;
  /** Where the trip is planned, linked from the overview. */
  planner: string;
}) {
  const t = useTranslations("site.trips");
  const v = useTrip(trip);
  const { days, chapters, picked, day } = v;
  const total = days.length;

  // The strip keeps the picked day in view.
  const strip = useRef<HTMLElement>(null);
  useEffect(() => {
    if (picked === null) return;
    strip.current
      ?.querySelector(`[data-day="${picked}"]`)
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [picked]);

  // Narrow screens: the card in view is the picked day, and the other way round.
  const cards = useRef<HTMLDivElement>(null);
  const swiped = useRef(false);
  const onSwipe = () => {
    const el = cards.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth) - 1;
    const next = i < 0 ? null : Math.min(total - 1, i);
    if (next === picked) return;
    swiped.current = true;
    v.pick(next);
  };
  useEffect(() => {
    const el = cards.current;
    if (!el) return;
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    el.scrollTo({ left: ((picked ?? -1) + 1) * el.clientWidth });
  }, [picked]);

  const stats: [string, string][] = [
    [String(total), t("stat.days")],
    [String(trip.stops.length), t("stat.stops")],
    [grouped(roadKm(trip), locale), t("stat.km")],
    [
      String(trip.legs.filter((l) => l.mode === "flight").length),
      t("stat.flights"),
    ],
  ];
  const overview = (
    <>
      <p className={s.kicker}>{t("overview")}</p>
      <h2 className={s.big}>{trip.name}</h2>
      <p className={s.sub}>
        {dayLabel(trip.startDate, locale)} {t("to")}{" "}
        {dayLabel(trip.endDate, locale)}
      </p>
      <dl className={s.stats}>
        {stats.map(([value, label]) => (
          <div key={label}>
            <dd>{value}</dd>
            <dt>{label}</dt>
          </div>
        ))}
      </dl>
      <ol className={s.stops}>
        {chapters.map(
          (c) =>
            c.stop && (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => v.pick(c.days[0]?.index ?? 0)}
                >
                  <b>{c.stop.position}</b>
                  <span>{c.stop.name}</span>
                  <small>{t("nights", { count: c.nights })}</small>
                </button>
              </li>
            ),
        )}
      </ol>
      <p className={s.small}>
        <a href={planner}>{t("planner")}</a>
        {locale !== "en" && ` · ${t("language")}`}
      </p>
    </>
  );
  const card = (d: DayPlan, i: number) => (
    <DayCard day={d} index={i} total={total} locale={locale} t={t} />
  );

  return (
    <div className={s.shell} data-look={v.look} data-frame="fill">
      <div className={s.mapBox}>
        <TripMap
          key={v.look}
          trip={trip}
          look={v.look}
          picked={v.lines}
          focus={v.focus}
          pad={v.pad}
          mark={v.mark}
          label={t("map")}
          broken={t("noMap")}
        />
      </div>

      <div className={s.bar}>
        <header className={s.crumb}>
          <Link href={`/${locale}/trips`} className={s.back}>
            ◂ <span>{t("up")}</span>
          </Link>
          <h1>{trip.name}</h1>
        </header>
        <fieldset className={s.looks}>
          <legend>{t("display")}</legend>
          {LOOKS.map((k) => (
            <button
              type="button"
              key={k}
              aria-pressed={v.look === k}
              onClick={() => v.setLook(k)}
            >
              {t(`look.${k}`)}
            </button>
          ))}
        </fieldset>
      </div>
      {picked !== null && (
        <button type="button" className={s.whole} onClick={v.whole}>
          ◂ {t("wholeTrip")}
        </button>
      )}

      <aside className={s.card}>
        <div className={s.cardScroll}>
          {day && picked !== null ? card(day, picked) : overview}
        </div>
        <div className={s.keys}>
          <button
            type="button"
            onClick={() => v.step(-1)}
            disabled={picked === 0}
          >
            ← {t("prev")}
          </button>
          <button
            type="button"
            className={s.play}
            onClick={() => v.setPlaying(!v.playing)}
          >
            {v.playing ? `❚❚ ${t("pause")}` : `▶ ${t("play")}`}
          </button>
          <button
            type="button"
            onClick={() => v.step(1)}
            disabled={picked === total - 1}
          >
            {t("next")} →
          </button>
        </div>
      </aside>

      <div className={s.dock}>
        <nav className={s.strip} aria-label={t("strip")} ref={strip}>
          <div
            className={s.stripGrid}
            style={{
              gridTemplateColumns: `repeat(${total}, minmax(var(--cell), 1fr))`,
            }}
          >
            {chapters.map((c) => (
              <button
                type="button"
                key={c.key}
                className={cx(
                  s.band,
                  picked !== null &&
                    c.days.some((d) => d.index === picked) &&
                    s.bandOn,
                )}
                style={{ gridColumn: `span ${c.days.length}` }}
                title={chapterName(c, t)}
                onClick={() => v.pick(c.days[0]?.index ?? 0)}
              >
                {c.stop ? <b>{c.stop.position}</b> : <Plane />}
                <span className={cx(!c.stop && s.sr)}>{chapterName(c, t)}</span>
              </button>
            ))}
            {days.map((d, i) => {
              const [week, num] = dayLabel(d.date, locale).split(" ");
              const on = i === picked;
              return (
                <button
                  type="button"
                  key={d.date}
                  data-day={i}
                  className={cx(s.frame, on && s.frameOn)}
                  aria-pressed={on}
                  onClick={() => v.pick(on ? null : i)}
                >
                  <strong>{Number.parseInt(num ?? "", 10)}</strong>
                  <em>{week}</em>
                </button>
              );
            })}
          </div>
        </nav>
        <div className={s.cards} ref={cards} onScroll={onSwipe}>
          <article>{overview}</article>
          {days.map((d, i) => (
            <article key={d.date}>{card(d, i)}</article>
          ))}
        </div>
      </div>
    </div>
  );
}
