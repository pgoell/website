"use client";

// The parts of the trip page only someone signed in sees: place cards, the
// place form, bookings, Google's card and the day as a plan to change. The
// page itself is trip-edit.tsx.

import { useEffect, useState } from "react";
import { cx } from "@/components/viewfinder/cx";
import {
  dayRoute,
  isMapsLink,
  mapsLink,
  NO_GOOGLE,
  optional,
  type PlaceInput,
  webLink,
} from "@/lib/trips/places";
import { dayLabel, zoneName } from "@/lib/trips/plan";
import { km } from "@/lib/trips/route";
import type {
  Booking,
  LngLat,
  StoredLeg,
  StoredPlace,
  StoredStop,
  StoredTrip,
} from "@/lib/trips/types";
import { GooglePlace } from "./google-place";
import { Leg, type T, two } from "./trip-view";
import s from "./trips.module.css";

/** Google's own card for the place, set apart from ours, with a way to reject it. */
export function GoogleCard({
  apiKey,
  place,
  onSet,
  t,
}: {
  apiKey: string;
  place: StoredPlace;
  onSet: (googlePlaceId: string | null) => void;
  t: T;
}) {
  if (place.googlePlaceId === NO_GOOGLE) {
    return (
      <button type="button" className={s.btn} onClick={() => onSet(null)}>
        {t("edit.lookUp")}
      </button>
    );
  }
  return (
    <>
      <GooglePlace apiKey={apiKey} place={place} onMatched={onSet} />
      <button
        type="button"
        className={s.linkButton}
        onClick={() => onSet(NO_GOOGLE)}
      >
        {t("edit.wrongGoogle")}
      </button>
    </>
  );
}

export function PlaceCard({
  place: p,
  away,
  pending,
  locale,
  t,
  onOpen,
  onShow,
  onEdit,
  onPin,
  onConfirm,
  onDelete,
}: {
  place: StoredPlace;
  /** Metres from here, when near me is on and the place has a pin. */
  away: number | null;
  pending: boolean;
  locale: string;
  t: T;
  /** In a list: a tap on the name shows this place alone, with Google's card. */
  onOpen?: () => void;
  onShow: () => void;
  onEdit: () => void;
  onPin: () => void;
  onConfirm: () => void;
  onDelete: () => void;
}) {
  const hasPin = p.lat !== null && p.lng !== null;
  // In a list on a phone the card keeps three buttons. The rest wait behind
  // "More", in the view of this place alone.
  const rare = onOpen ? s.rare : undefined;
  // Delete asks once more on the button itself, and forgets after 3 seconds.
  const [sure, setSure] = useState(false);
  useEffect(() => {
    if (!sure) return;
    const timer = setTimeout(() => setSure(false), 3000);
    return () => clearTimeout(timer);
  }, [sure]);
  const link = webLink(p.url);
  return (
    <article className={s.placeCard}>
      <div className={s.placeHead}>
        <h3>
          {onOpen ? (
            <button type="button" onClick={onOpen}>
              {p.name}
            </button>
          ) : (
            p.name
          )}
        </h3>
        <span>
          {away !== null && `${km(away, locale)}, `}
          {p.day ? `${dayLabel(p.day, locale)}, ` : ""}
          {p.createdBy}
        </span>
      </div>
      {p.tags && <p className={s.dim}>{p.tags}</p>}
      {p.note && <p className={s.note}>{p.note}</p>}
      {link && !isMapsLink(link) && (
        <a href={link} target="_blank" rel="noreferrer" className={s.placeLink}>
          {link}
        </a>
      )}
      <div className={s.row}>
        {p.status === "idea" && (
          <button
            type="button"
            className={s.btnMain}
            disabled={pending}
            onClick={onConfirm}
          >
            {t("edit.confirm")}
          </button>
        )}
        {hasPin && (
          <button type="button" className={s.btn} onClick={onShow}>
            {t("edit.show")}
          </button>
        )}
        <button type="button" className={cx(s.btn, rare)} onClick={onPin}>
          {hasPin ? t("edit.movePin") : t("edit.setPin")}
        </button>
        <button type="button" className={cx(s.btn, rare)} onClick={onEdit}>
          {t("edit.edit")}
        </button>
        <a
          className={s.btn}
          href={mapsLink(p)}
          target="_blank"
          rel="noreferrer"
        >
          {t("edit.googleMaps")}
        </a>
        <button
          type="button"
          className={cx(sure ? s.btnMain : s.btn, rare)}
          disabled={pending}
          onClick={sure ? onDelete : () => setSure(true)}
        >
          {sure ? t("edit.reallyDelete") : t("edit.delete")}
        </button>
        {onOpen && (
          <button
            type="button"
            className={cx(s.btn, s.phoneOnly)}
            onClick={onOpen}
          >
            {t("edit.more")}
          </button>
        )}
      </div>
    </article>
  );
}

export function IdeaInput({
  pending,
  t,
  onAdd,
}: {
  pending: boolean;
  t: T;
  /** `done` is called once the idea is saved. */
  onAdd: (text: string, done: () => void) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      className={s.inline}
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        // Keep the text until it is saved, and whatever was typed since.
        onAdd(value.trim(), () =>
          setValue((now) => (now === value ? "" : now)),
        );
      }}
    >
      <input
        className={s.field}
        placeholder={t("edit.ideaPlaceholder")}
        aria-label={t("edit.ideaPlaceholder")}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit" className={s.btnMain} disabled={pending}>
        {t("edit.add")}
      </button>
    </form>
  );
}

export function PlaceForm({
  initial,
  days,
  pending,
  saving,
  locale,
  t,
  onSave,
  onCancel,
}: {
  initial: PlaceInput;
  days: string[];
  pending: boolean;
  saving: boolean;
  locale: string;
  t: T;
  onSave: (input: PlaceInput) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState(initial);
  const set = (patch: Partial<PlaceInput>) => setV({ ...v, ...patch });
  return (
    <form
      className={s.stack}
      onSubmit={(e) => {
        e.preventDefault();
        onSave(v);
      }}
    >
      <h2 className={s.formTitle}>
        {initial.id ? t("edit.edit") : t("edit.newPlace")}
      </h2>
      <input
        className={s.field}
        placeholder={t("edit.name")}
        aria-label={t("edit.name")}
        required
        value={v.name}
        onChange={(e) => set({ name: e.target.value })}
      />
      <input
        className={s.field}
        placeholder={t("edit.link")}
        aria-label={t("edit.link")}
        type="url"
        value={v.url ?? ""}
        onChange={(e) => set({ url: e.target.value })}
      />
      <input
        className={s.field}
        placeholder={t("edit.tags")}
        aria-label={t("edit.tags")}
        value={v.tags ?? ""}
        onChange={(e) => set({ tags: e.target.value })}
      />
      <textarea
        className={s.field}
        placeholder={t("edit.notes")}
        aria-label={t("edit.notes")}
        rows={3}
        value={v.note ?? ""}
        onChange={(e) => set({ note: e.target.value })}
      />
      <select
        className={s.field}
        aria-label={t("edit.day")}
        value={v.day ?? ""}
        onChange={(e) => set({ day: e.target.value || null })}
      >
        <option value="">{t("edit.noDay")}</option>
        {days.map((d) => (
          <option key={d} value={d}>
            {dayLabel(d, locale)}
          </option>
        ))}
      </select>
      <div className={s.inline}>
        <button type="submit" className={s.btnMain} disabled={pending}>
          {saving ? t("edit.saving") : t("edit.save")}
        </button>
        <button type="button" className={s.btn} onClick={onCancel}>
          {t("edit.cancel")}
        </button>
      </div>
    </form>
  );
}

/** The bookings tab: the hotels, then the flights. */
export function Bookings({
  trip,
  locale,
  t,
  onFocus,
}: {
  trip: StoredTrip;
  locale: string;
  t: T;
  onFocus: (points: LngLat[]) => void;
}) {
  return (
    <>
      <h2 className={s.groupHead}>{t("edit.hotels")}</h2>
      {trip.bookings.map((b) => (
        <BookingCard
          key={b.id}
          booking={b}
          stop={trip.stops.find((x) => x.position === b.stopPosition)}
          locale={locale}
          t={t}
          onFocus={onFocus}
        />
      ))}
      <h2 className={s.groupHead}>{t("edit.flights")}</h2>
      {trip.legs
        .filter((l) => l.mode === "flight")
        .map((l) => (
          <article key={l.id} className={s.placeCard}>
            <p className={s.dim}>{dayLabel(l.leaveDate, locale)}</p>
            <Leg leg={l} locale={locale} cost={l.cost} />
          </article>
        ))}
    </>
  );
}

export function BookingCard({
  booking: b,
  stop,
  locale,
  t,
  onFocus,
}: {
  booking: Booking;
  stop: StoredStop | undefined;
  locale: string;
  t: T;
  onFocus: (points: LngLat[]) => void;
}) {
  return (
    <article className={s.placeCard}>
      <div>
        <h3 className={s.cardTitle}>{b.title}</h3>
        <p className={s.dim}>
          {stop && `${stop.name}, `}
          {dayLabel(b.startAt, locale)} {t("to")} {dayLabel(b.endAt, locale)},{" "}
          {zoneName(b.startTz)}
        </p>
      </div>
      <dl className={s.facts}>
        <dt>{t("edit.confirmation")}</dt>
        <dd className={s.mono}>{b.confirmation}</dd>
        {Object.entries(b.detail).map(([k, value]) => (
          <div key={k} className={s.contents}>
            <dt>{k}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {stop && (
        <div className={s.row}>
          <button
            type="button"
            className={s.btn}
            onClick={() => onFocus([[stop.lng, stop.lat]])}
          >
            {t("edit.show")}
          </button>
          <a
            className={s.btn}
            href={mapsLink({ name: b.title, lat: stop.lat, lng: stop.lng })}
            target="_blank"
            rel="noreferrer"
          >
            {t("edit.googleMaps")}
          </a>
        </div>
      )}
    </article>
  );
}

/** The picked day in the card: how it goes, its note and its places in order. */
export function DayEdit({
  date,
  index,
  total,
  trip,
  pending,
  google,
  drawing,
  locale,
  t,
  onDraw,
  onUndraw,
  onAdd,
  onRemove,
  onSelectPlace,
  onOrder,
  onNote,
}: {
  date: string;
  /** Which day of the trip this is, from 0. */
  index: number;
  total: number;
  trip: StoredTrip;
  pending: boolean;
  /** Google's place card opens with a place. */
  google: boolean;
  /** The leg whose line is bent on the map right now, by id. */
  drawing: number | null;
  locale: string;
  t: T;
  /** Bend a ground leg's line, or go back to the one it came with. */
  onDraw: (leg: StoredLeg) => void;
  onUndraw: (leg: StoredLeg) => void;
  /** Add a route to the day: its name, and whether it comes back. */
  onAdd: (title: string, back: boolean) => void;
  /** Remove a route that was added in the app. */
  onRemove: (leg: StoredLeg) => void;
  onSelectPlace: (id: number) => void;
  onOrder: (ids: number[]) => void;
  onNote: (note: string) => void;
}) {
  const { stops, places, steps } = dayRoute(trip, date);
  const legs = trip.legs.filter((l) => l.leaveDate === date);
  const checkIn = trip.bookings.find((b) => b.startAt.startsWith(date));
  const saved = trip.dayNotes[date] ?? "";
  const [note, setNote] = useState(saved);
  const [undrawing, setUndrawing] = useState<number | null>(null);
  // The form for a new route: its name, or null while closed.
  const [naming, setNaming] = useState<string | null>(null);
  // A day at one stop goes out and comes back. A travel day goes one way.
  const [back, setBack] = useState(stops.length === 1);
  const title = naming?.trim() ?? "";
  const taken = legs.some((l) => l.title === title);

  const move = (from: number, to: number) => {
    const ids = places.map((p) => p.id);
    ids.splice(to, 0, ...ids.splice(from, 1));
    onOrder(ids);
  };

  return (
    <>
      <p className={s.kicker}>
        {t("day")} {two(index + 1)} <i>/ {total}</i>
      </p>
      <h2 className={s.big}>{dayLabel(date, locale)}</h2>
      <p className={s.where}>
        {stops.map((x) => x.name).join(" → ") || t("inTheAir")}
      </p>
      <div className={s.stack}>
        <textarea
          className={cx(s.field, s.noteField)}
          placeholder={t("edit.dayNote")}
          aria-label={t("edit.dayNote")}
          rows={Math.min(6, Math.max(2, note.split("\n").length))}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {note.trim() !== saved && (
          <div>
            <button
              type="button"
              className={s.btnMain}
              disabled={pending}
              onClick={() => onNote(note)}
            >
              {t("edit.saveNote")}
            </button>
          </div>
        )}
        {legs.map((l) => (
          <div key={l.id}>
            <Leg leg={l} locale={locale} cost={l.cost} />
            {l.mode === "ground" && (
              <div className={s.row}>
                <button
                  type="button"
                  className={s.btn}
                  disabled={pending || drawing !== null}
                  onClick={() => onDraw(l)}
                >
                  {drawing === l.id ? t("edit.drawing") : t("edit.editRoute")}
                </button>
                {l.own && drawing === null && (
                  <button
                    type="button"
                    className={s.btn}
                    disabled={pending}
                    onClick={() => {
                      // The route is gone after this, so it asks once.
                      if (undrawing === l.id) onRemove(l);
                      setUndrawing(undrawing === l.id ? null : l.id);
                    }}
                  >
                    {undrawing === l.id
                      ? t("edit.sureAgain")
                      : t("edit.removeRoute")}
                  </button>
                )}
                {!l.own && l.drawn && drawing === null && (
                  <button
                    type="button"
                    className={s.btn}
                    disabled={pending}
                    onClick={() => {
                      // The drawn line is gone after this, so it asks once.
                      if (undrawing === l.id) onUndraw(l);
                      setUndrawing(undrawing === l.id ? null : l.id);
                    }}
                  >
                    {undrawing === l.id
                      ? t("edit.sureAgain")
                      : t("edit.firstRoute")}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {stops.length > 0 &&
          drawing === null &&
          (naming === null ? (
            <div>
              <button
                type="button"
                className={s.btn}
                disabled={pending}
                onClick={() => setNaming("")}
              >
                {t("edit.addRoute")}
              </button>
            </div>
          ) : (
            <form
              className={s.stack}
              onSubmit={(e) => {
                e.preventDefault();
                if (!title || taken) return;
                onAdd(title, back);
                setNaming(null);
              }}
            >
              <input
                className={s.field}
                placeholder={t("edit.routeName")}
                aria-label={t("edit.routeNameLabel")}
                maxLength={80}
                // biome-ignore lint/a11y/noAutofocus: the form opens on a tap
                autoFocus
                value={naming}
                onChange={(e) => setNaming(e.target.value)}
              />
              <label className={s.check}>
                <input
                  type="checkbox"
                  checked={back}
                  onChange={(e) => setBack(e.target.checked)}
                />
                {t("edit.andBack", { stop: stops[0]?.name ?? "" })}
              </label>
              {taken && (
                <p className={cx(s.notice, s.warn)}>
                  {t("error.routeNameTaken")}
                </p>
              )}
              <div className={s.row}>
                <button
                  type="submit"
                  className={s.btnMain}
                  disabled={pending || !title || taken}
                >
                  {t("edit.pickEnd")}
                </button>
                <button
                  type="button"
                  className={s.btn}
                  onClick={() => setNaming(null)}
                >
                  {t("edit.cancel")}
                </button>
              </div>
            </form>
          ))}
        {checkIn && (
          <p className={s.checkIn}>
            <b>⌂ {checkIn.title}</b>
            <span className={s.dim}>
              ,{" "}
              {t("edit.checkIn", {
                time: checkIn.detail["Check-in"] ?? "",
                zone: zoneName(checkIn.startTz),
              })}
            </span>
          </p>
        )}
      </div>
      {places.length > 0 && (
        <>
          <p className={cx(s.kicker, s.gap)}>
            {t("edit.placeCount", { count: places.length })}
          </p>
          <ol className={s.dayPlaces}>
            {places.map((p, i) => (
              <li key={p.id}>
                <span data-idea={p.status === "idea" || undefined}>
                  {i + 1}
                </span>
                <button
                  type="button"
                  className={cx(s.pick, optional(p) && s.dim)}
                  onClick={() => onSelectPlace(p.id)}
                >
                  {p.name}
                  {optional(p) && `, ${t("edit.optional")}`}
                  {p.note && <small>{p.note}</small>}
                </button>
                {steps.has(p.id) && (
                  <em>{km(steps.get(p.id) as number, locale)}</em>
                )}
                <span className={s.order}>
                  <button
                    type="button"
                    aria-label={t("edit.moveUp", { name: p.name })}
                    disabled={pending || i === 0}
                    onClick={() => move(i, i - 1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={t("edit.moveDown", { name: p.name })}
                    disabled={pending || i === places.length - 1}
                    onClick={() => move(i, i + 1)}
                  >
                    ↓
                  </button>
                </span>
              </li>
            ))}
          </ol>
          {google && <p className={s.small}>{t("edit.googleHint")}</p>}
        </>
      )}
    </>
  );
}
