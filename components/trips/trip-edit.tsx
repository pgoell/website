"use client";

import { useTranslations } from "next-intl";
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  deletePlace,
  drawLeg,
  orderDay,
  saveDayNote,
  setGooglePlaceId,
} from "@/app/[locale]/(site)/trips/actions";
import { cx } from "@/components/viewfinder/cx";
import {
  blank,
  dayRoute,
  groupByStop,
  type PlaceInput,
  pin,
} from "@/lib/trips/places";
import { signOutAction } from "@/lib/trips/private";
import type { LngLat, StoredPlace, StoredTrip } from "@/lib/trips/types";
import {
  BookingCard,
  Bookings,
  DayEdit,
  GoogleCard,
  IdeaInput,
  PlaceCard,
  PlaceForm,
} from "./edit-parts";
import { RouteBar, RouteMenu } from "./route-edit";
import { type RouteOnMap, TripMap } from "./trip-map";
import { Overview, Strip, TripBar, two } from "./trip-view";
import s from "./trips.module.css";
import { useRouteEdit } from "./use-route-edit";
import { useTrip } from "./use-trip";
import { TABS, useTripEdit } from "./use-trip-edit";

/** A list shows the filter once it holds more than this many places. */
const FILTER_FROM = 8;

/**
 * One trip for someone signed in: the film strip of the open view, with the
 * places, ideas and bookings a tab away, and everything to change them. The
 * page hands it the whole trip, open or private, so it never shows to a
 * visitor.
 */
export function TripEditor({
  trip,
  locale,
  userName,
  mapsKey,
}: {
  trip: StoredTrip;
  locale: string;
  userName: string;
  /** Browser key for Google's place card. Without it the card is left out. */
  mapsKey?: string;
}) {
  const t = useTranslations("site.trips");
  const e = useTripEdit(trip);
  // A ground leg whose line is bent on the map.
  const bend = useRouteEdit(trip.slug);
  const drawing = bend.state;
  const v = useTrip(
    trip,
    e.picking !== null || drawing !== null || e.editing !== null,
  );
  const { days, chapters, picked } = v;
  const total = days.length;
  const date = picked === null ? null : (days[picked]?.date ?? null);
  const dates = useMemo(() => days.map((d) => d.date), [days]);
  const { tab, detail, editing, picking } = e;
  const google = mapsKey && !e.offline ? mapsKey : undefined;

  // A new day, picked any way, opens its plan.
  const { setTab, setDetail, setEditing } = e;
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the day changes
  useEffect(() => {
    setTab("plan");
    setDetail(null);
    setEditing(null);
  }, [picked]);

  // ---------- where the map looks ----------

  const route = useMemo(
    () => (tab === "plan" && date ? dayRoute(trip, date) : null),
    [trip, tab, date],
  );
  const dayLines = useMemo(
    () =>
      date
        ? trip.legs
            .filter((l) => l.leaveDate === date && l.mode === "ground")
            .map((l) => l.path)
        : [],
    [trip.legs, date],
  );
  const [focus, setFocusState] = useState<{ at: LngLat[]; close: boolean }>({
    at: v.all,
    close: false,
  });
  const setFocus = (at: LngLat[], close = false) =>
    at.length && setFocusState({ at, close });
  // The map follows the picked day, or shows the whole trip again. Only a
  // new day moves it: the trip changing after a save does not.
  const lastDay = useRef(picked);
  useEffect(() => {
    if (lastDay.current === picked) return;
    lastDay.current = picked;
    const points = [...dayLines, ...(route?.lines ?? [])].flat();
    setFocusState({
      at: points.length ? points : (v.day?.points ?? v.all),
      close: false,
    });
  }, [picked, dayLines, route, v.day, v.all]);

  // The strip keeps the picked day in view.
  const strip = useRef<HTMLElement>(null);
  useEffect(() => {
    if (picked === null) return;
    strip.current
      ?.querySelector(`[data-day="${picked}"]`)
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [picked]);

  // A new day or tab starts the card at its top.
  const scroll = useRef<HTMLDivElement>(null);
  const cardKey = `${tab} ${picked} ${detail ? JSON.stringify(detail) : ""}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the card changes
  useEffect(() => {
    scroll.current?.scrollTo({ top: 0 });
  }, [cardKey]);

  // ---------- places ----------

  const one =
    detail && "place" in detail
      ? trip.places.find((p) => p.id === detail.place)
      : undefined;
  const hotels =
    detail && "stop" in detail
      ? trip.bookings.filter((b) => b.stopPosition === detail.stop)
      : [];
  const detailStop =
    detail && "stop" in detail
      ? trip.stops.find((x) => x.position === detail.stop)
      : undefined;

  // A tapped marker, or a place's name, shows that one place in the card.
  const open = (to: NonNullable<typeof detail>, at: LngLat[]) => {
    setEditing(null);
    setFocus(at, true);
    setDetail(to);
  };
  const selectPlace = (id: number) => {
    const p = trip.places.find((x) => x.id === id);
    if (p) open({ place: id }, pin(p));
  };
  const selectStop = (position: number) => {
    const x = trip.stops.find((st) => st.position === position);
    if (x) open({ stop: position }, [[x.lng, x.lat]]);
  };

  const bent = drawing?.points;
  const bentAt = useMemo(() => bent?.map((p) => p.at) ?? [], [bent]);
  const edit: RouteOnMap | null = drawing && {
    stretches: drawing.stretches,
    points: bentAt,
    selected: drawing.selected,
    before: drawing.before,
    byHand: drawing.byHand !== null,
    onInsert: bend.insert,
    onMove: bend.move,
    onDrop: bend.drop,
    onSelect: bend.select,
    onStroke: bend.stroke,
  };
  const mapTrip = useMemo(
    () => ({ ...trip, places: route?.places ?? e.shown }),
    [trip, e.shown, route],
  );
  const mapLines = useMemo(
    () => (route ? [...dayLines, ...route.lines] : dayLines),
    [route, dayLines],
  );
  const ideas = e.shown.filter((p) => p.status === "idea");
  const confirmed = e.shown.filter((p) => p.status === "confirmed");

  const filterBox = (
    <input
      className={s.field}
      type="search"
      placeholder={t("edit.filter")}
      aria-label={t("edit.filter")}
      value={e.filter}
      onChange={(ev) => e.setFilter(ev.target.value)}
    />
  );

  const cardProps = (p: StoredPlace) => ({
    place: p,
    away: e.away(p),
    pending: e.busy,
    locale,
    t,
    onShow: () => setFocus(pin(p), true),
    onEdit: () => setEditing(p),
    onPin: () => e.setPicking(p),
    onConfirm: () => e.save({ ...p, status: "confirmed" }),
    onDelete: () => e.run(() => deletePlace(trip.slug, p.id)),
  });
  const card = (p: StoredPlace) => (
    <PlaceCard
      key={p.id}
      {...cardProps(p)}
      onOpen={() => open({ place: p.id }, pin(p))}
    />
  );
  const list = (places: StoredPlace[]) =>
    e.here
      ? e.byDistance(places).map(card)
      : groupByStop(trip.stops, places).map(([name, group]) => (
          <section key={name ?? ""} className={s.stack}>
            <h2 className={s.groupHead}>
              {name ?? t("edit.noPin")} ({group.length})
            </h2>
            {group.map(card)}
          </section>
        ));

  const nearButton = (
    <button
      type="button"
      className={e.near ? s.btnMain : s.btn}
      aria-pressed={e.near}
      onClick={() => e.setNear(!e.near)}
    >
      {e.near && !e.here ? t("edit.finding") : t("edit.near")}
    </button>
  );

  // ---------- the card's content ----------

  const overview = (
    <Overview
      trip={trip}
      total={total}
      chapters={chapters}
      locale={locale}
      t={t}
      onPick={v.pick}
    >
      <p className={s.small}>
        {t("edit.summary", {
          places: e.count("confirmed"),
          ideas: e.count("idea"),
        })}{" "}
        <button
          type="button"
          className={s.linkButton}
          onClick={() => setTab("ideas")}
        >
          {t("edit.goThroughIdeas")}
        </button>
      </p>
      <p className={s.small}>{t("edit.howTo")}</p>
    </Overview>
  );

  const dayCard =
    date !== null && picked !== null ? (
      <DayEdit
        key={date}
        date={date}
        index={picked}
        total={total}
        trip={trip}
        pending={e.busy}
        google={!!google}
        drawing={drawing?.leg.id ?? null}
        locale={locale}
        t={t}
        onDraw={(leg) => {
          bend.start(leg);
          setFocus(leg.path);
        }}
        onUndraw={(leg) =>
          e.run(() => drawLeg(trip.slug, leg.leaveDate, leg.title, []))
        }
        onSelectPlace={selectPlace}
        onOrder={(ids) => e.run(() => orderDay(trip.slug, date, ids))}
        onNote={(note) => e.run(() => saveDayNote(trip.slug, date, note))}
      />
    ) : null;

  const body = editing ? (
    <PlaceForm
      key={editing.id ?? "new"}
      initial={editing}
      days={dates}
      pending={e.busy}
      saving={e.pending}
      locale={locale}
      t={t}
      onCancel={() => setEditing(null)}
      // Stay open until the save is through, so a failed one loses no text.
      onSave={(input) =>
        e.save(input, () =>
          setEditing((now: PlaceInput | null) =>
            now === editing ? null : now,
          ),
        )
      }
    />
  ) : detail ? (
    <div className={s.stack}>
      <button type="button" className={s.back} onClick={() => setDetail(null)}>
        ◂ {t("edit.back")}
      </button>
      {one && <PlaceCard {...cardProps(one)} />}
      {one && google && (
        <section className={s.stack}>
          <p className={s.groupHead}>{t("edit.fromGoogle")}</p>
          <GoogleCard
            apiKey={google}
            place={one}
            t={t}
            onSet={(id) => e.run(() => setGooglePlaceId(trip.slug, one.id, id))}
          />
        </section>
      )}
      {detailStop && hotels.length === 0 && (
        <p className={s.formTitle}>{detailStop.name}</p>
      )}
      {hotels.map((b) => (
        <BookingCard
          key={b.id}
          booking={b}
          stop={trip.stops.find((x) => x.position === b.stopPosition)}
          locale={locale}
          t={t}
          onFocus={(at) => setFocus(at, true)}
        />
      ))}
    </div>
  ) : tab === "plan" ? (
    (dayCard ?? overview)
  ) : tab === "places" ? (
    <div className={s.stack}>
      <div className={s.inline}>
        <button
          type="button"
          className={s.btnMain}
          onClick={() => setEditing(blank("confirmed"))}
        >
          {t("edit.addPlace")}
        </button>
        {nearButton}
      </div>
      {e.count("confirmed") > FILTER_FROM && filterBox}
      {e.count("confirmed") === 0 && (
        <p className={s.small}>{t("edit.noPlaces")}</p>
      )}
      {list(confirmed)}
    </div>
  ) : tab === "ideas" ? (
    <div className={s.stack}>
      <IdeaInput
        pending={e.busy}
        t={t}
        onAdd={(text, done) => {
          const isLink = /^https?:\/\//i.test(text) && URL.canParse(text);
          e.save(
            {
              ...blank("idea"),
              name: isLink ? new URL(text).hostname : text,
              url: isLink ? text : null,
            },
            done,
          );
        }}
      />
      {e.count("idea") === 0 && <p className={s.small}>{t("edit.noIdeas")}</p>}
      {e.count("idea") > 0 && <div className={s.inline}>{nearButton}</div>}
      {e.count("idea") > FILTER_FROM && filterBox}
      {list(ideas)}
    </div>
  ) : (
    <div className={s.stack}>
      <Bookings
        trip={trip}
        locale={locale}
        t={t}
        onFocus={(at) => setFocus(at, true)}
      />
    </div>
  );

  // On a phone the card takes more room for the form, and none while the map
  // is tapped to set a pin or draw a line.
  const panel =
    picking || drawing ? "0px" : editing ? "68dvh" : detail ? "54dvh" : "46dvh";

  return (
    <div
      className={s.shell}
      data-look={v.look}
      data-frame="fill"
      data-edit
      data-tapping={picking || drawing ? true : undefined}
      data-routing={drawing ? true : undefined}
      data-editing={editing ? true : undefined}
      style={{ "--panel": panel } as CSSProperties}
    >
      <div className={s.mapBox}>
        <TripMap
          key={v.look}
          trip={mapTrip}
          look={v.look}
          picked={mapLines}
          focus={focus.at}
          closeUp={focus.close}
          pad={v.pad}
          mark={v.mark}
          label={t("map")}
          broken={t("noMap")}
          editing={{
            numbered: route !== null,
            picking: picking !== null,
            edit,
            menu:
              drawing && drawing.selected !== null && !drawing.dragging ? (
                <RouteMenu route={bend} state={drawing} />
              ) : null,
            onSelectPlace: selectPlace,
            onSelectStop: selectStop,
            onMiss: () => setDetail(null),
            onPick: (lng, lat) => {
              if (!picking) return;
              e.save({ ...picking, lat, lng });
              e.setPicking(null);
            },
          }}
        />
        {drawing && <RouteBar route={bend} state={drawing} locale={locale} />}
      </div>

      {drawing ? null : picking ? (
        <div className={s.banner}>
          <span>{t("edit.pinHint", { name: picking.name })}</span>
          <button
            type="button"
            className={s.linkButton}
            onClick={() => e.setPicking(null)}
          >
            {t("edit.cancel")}
          </button>
        </div>
      ) : (
        <>
          <TripBar
            name={trip.name}
            locale={locale}
            look={v.look}
            setLook={v.setLook}
            t={t}
          />
          {picked !== null && (
            <button type="button" className={s.whole} onClick={v.whole}>
              ◂ {t("wholeTrip")}
            </button>
          )}
        </>
      )}

      <aside className={s.card}>
        <nav className={s.tabs} aria-label={t("edit.lists")}>
          {TABS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={tab === k && !detail && !editing}
              onClick={() => {
                setTab(k);
                setEditing(null);
                setDetail(null);
              }}
            >
              {k === "plan" && picked !== null
                ? `${t("day")} ${two(picked + 1)}`
                : t(`edit.tab.${k}`)}
              {k === "ideas" && e.count("idea") > 0 && <i>{e.count("idea")}</i>}
            </button>
          ))}
        </nav>
        <div className={s.cardScroll} ref={scroll}>
          {e.offline && <p className={s.notice}>{t("edit.offlineNote")}</p>}
          {e.error && !drawing && (
            <p className={cx(s.notice, s.warn)}>{t(`error.${e.error}`)}</p>
          )}
          {body}
          <form method="post" action={signOutAction()} className={s.foot}>
            <input
              type="hidden"
              name="next"
              value={`/${locale}/trips/${trip.slug}`}
            />
            {t("signedInAs", { name: userName })} ·{" "}
            <button type="submit" className={s.linkButton}>
              {t("signOut")}
            </button>
          </form>
        </div>
        {tab === "plan" && !detail && !editing && (
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
        )}
      </aside>

      <div className={s.dock}>
        <Strip
          days={days}
          chapters={chapters}
          picked={picked}
          locale={locale}
          t={t}
          onPick={v.pick}
          stripRef={strip}
          places={(d) => d.places.length}
        />
      </div>
    </div>
  );
}
