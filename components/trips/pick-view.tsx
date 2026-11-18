"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { metres } from "@/lib/trips/geo";
import { LOOKS } from "@/lib/trips/look";
import {
  areaTime,
  isMust,
  KIND_NAMES,
  type PickState,
  RADII,
  roughDays,
  type Vote,
} from "@/lib/trips/pick";
import type { PlaceInfo } from "./google-places";
import s from "./pick.module.css";
import { type Dot, type Numbered, PickMap, type Ring } from "./pick-map";
import { type Pick, type Tab, usePick } from "./use-pick";

type T = ReturnType<typeof useTranslations>;
type LatLng = { lat: number; lng: number };

const TABS: Tab[] = ["area", "swipe", "matches"];
const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function bearing(a: LatLng, b: LatLng) {
  const x = (b.lng - a.lng) * Math.cos((a.lat * Math.PI) / 180);
  return (Math.atan2(x, b.lat - a.lat) * 180) / Math.PI;
}
const dirOf = (deg: number) =>
  DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8] as string;
const distance = (m: number) =>
  m < 1000 ? `${Math.round(m / 10) * 10} m` : `${+(m / 1000).toFixed(1)} km`;
const count = (n: number | null) =>
  n === null ? "" : n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n);

const Icon = {
  no: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={s.ico}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  yes: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={s.ico}>
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  ),
  must: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={s.icoFill}>
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
    </svg>
  ),
  undo: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={s.ico}>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </svg>
  ),
};

export function PickView({
  slug,
  tripName,
  locale,
  initial,
  mapsKey,
  start,
}: {
  slug: string;
  tripName: string;
  locale: string;
  initial: PickState;
  mapsKey: string | undefined;
  start: LatLng;
}) {
  const t = useTranslations("site.trips.pick");
  const tt = useTranslations("site.trips");
  const p = usePick({ slug, initial, mapsKey, start });
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const q = window.matchMedia("(max-width: 900px)");
    const on = () => setNarrow(q.matches);
    on();
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);

  // Keys on the swipe step: arrows answer, Z takes back.
  const { tab, undo, top } = p;
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (tab !== "swipe" || !top) return;
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      const v: Vote | null =
        e.key === "ArrowRight"
          ? "yes"
          : e.key === "ArrowLeft"
            ? "no"
            : e.key === "ArrowUp"
              ? "must"
              : null;
      if (v) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("pick-fly", { detail: v }));
      } else if (e.key.toLowerCase() === "z") undo();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [tab, top, undo]);

  const pad = useMemo(
    () =>
      narrow
        ? { top: 40, right: 30, bottom: 30, left: 30 }
        : { top: 150, right: 500, bottom: 60, left: 60 },
    [narrow],
  );

  const numbers = useMemo(() => {
    const m = new Map<string, number>();
    let n = 0;
    for (const a of p.areas) for (const id of a.ids) m.set(id, ++n);
    return m;
  }, [p.areas]);

  const dots: Dot[] = useMemo(
    () =>
      p.tab === "matches"
        ? []
        : p.state.candidates.flatMap((c) => {
            const at = p.spotOf(c.id);
            if (!at) return [];
            const v = p.state.mine[c.id];
            return [
              { id: c.id, ...at, seen: !v ? "new" : v === "no" ? "no" : "yes" },
            ];
          }),
    [p.tab, p.state, p.spotOf],
  );

  const numbered: Numbered[] = useMemo(
    () =>
      p.tab !== "matches"
        ? []
        : p.list.flatMap((c) => {
            const at = p.spotOf(c.id);
            const n = numbers.get(c.id);
            if (!at || !n) return [];
            return [
              {
                id: c.id,
                ...at,
                n,
                must: isMust(p.state, c.id),
                name: p.infos[c.id]?.name ?? "",
              },
            ];
          }),
    [p.tab, p.list, p.spotOf, numbers, p.state, p.infos],
  );

  const rings: Ring[] = useMemo(
    () =>
      p.tab !== "matches"
        ? []
        : p.areas
            .filter((a) => a.ids.length > 1)
            .map((a) => ({
              center: a.center,
              reach: a.reach,
              label: `${areaName(a.ids, p.infos, t)} · ${a.ids.length}`,
            })),
    [p.tab, p.areas, p.infos, t],
  );

  const topSpot = p.top ? p.spotOf(p.top.id) : null;
  const current =
    p.tab === "swipe" && topSpot && p.top
      ? { ...topSpot, name: p.infos[p.top.id]?.name ?? "" }
      : null;

  // What to bring into view: the circle, or the listed places. Only when the step or the circle changes.
  const fitKey =
    p.tab === "matches"
      ? `m:${p.filter}:${numbered.length}`
      : `${p.tab}:${p.pin.lat},${p.pin.lng}:${p.radius}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: the key says when to move
  const fit = useMemo(() => {
    if (p.tab === "matches" && numbered.length > 0) return numbered;
    const dLat = p.radius / 111_195;
    const dLng = dLat / Math.cos((p.pin.lat * Math.PI) / 180);
    return [
      { lat: p.pin.lat + dLat, lng: p.pin.lng + dLng },
      { lat: p.pin.lat - dLat, lng: p.pin.lng - dLng },
    ];
  }, [fitKey]);

  return (
    <div
      className={s.shell}
      data-look={p.look}
      data-frame="fill"
      data-tab={p.tab}
    >
      <div className={s.mapBox}>
        <PickMap
          key={p.look}
          look={p.look}
          pin={p.pin}
          radius={p.radius}
          showCircle={p.tab !== "matches"}
          dots={dots}
          current={current}
          numbered={numbered}
          rings={rings}
          selected={p.selected}
          fit={fit}
          pad={pad}
          label={tt("map")}
          broken={tt("noMap")}
          onPick={p.tab === "area" ? p.setPin : undefined}
          onSelect={p.setSelected}
        />
      </div>

      <div className={s.bar}>
        <header className={s.crumb}>
          <Link href={`/${locale}/trips/${slug}`} className={s.back}>
            ◂ <span>{tripName}</span>
          </Link>
          <h1>{t("title")}</h1>
        </header>
        <fieldset className={s.looks}>
          <legend>{tt("display")}</legend>
          {LOOKS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={p.look === k}
              onClick={() => p.setLook(k)}
            >
              {tt(`look.${k}`)}
            </button>
          ))}
        </fieldset>
      </div>

      <section className={s.panel}>
        <nav className={s.tabs} aria-label={t("steps")}>
          {TABS.map((k, i) => (
            <button
              key={k}
              type="button"
              aria-pressed={p.tab === k}
              onClick={() => p.setTab(k)}
            >
              <b>{i + 1}</b>
              {t(`tab.${k}`)}
              {k === "swipe" && p.deck.length > 0 && <i>{p.deck.length}</i>}
              {k === "matches" && p.lists.both.length > 0 && (
                <i>{p.lists.both.length}</i>
              )}
            </button>
          ))}
        </nav>
        {p.problem && <p className={s.problem}>{t(`problem.${p.problem}`)}</p>}
        {p.tab === "area" ? (
          <AreaStep p={p} t={t} />
        ) : p.tab === "swipe" ? (
          <SwipeStep p={p} t={t} />
        ) : (
          <MatchesStep p={p} t={t} numbers={numbers} />
        )}
      </section>

      <output className={s.toast} data-on={p.toast ? true : undefined}>
        {p.toast && (
          <>
            {t("match")}
            <small>
              {p.infos[p.toast.id]?.name}
              {p.toast.must ? ` · ${t("theyMust")}` : ""}
            </small>
          </>
        )}
      </output>
    </div>
  );
}

/** An area named after its best-known place. */
function areaName(ids: string[], infos: Record<string, PlaceInfo>, t: T) {
  const name = ids.map((id) => infos[id]?.name).find(Boolean);
  return name ? t("around", { name }) : t("anArea");
}

function AreaStep({ p, t }: { p: Pick; t: T }) {
  const fresh = p.inCircle.filter((c) => !p.state.mine[c.id]).length;
  return (
    <div className={s.scroll}>
      <p className={s.kicker}>{t("step", { n: 1 })}</p>
      <h2 className={s.big}>{t("areaTitle")}</h2>
      <p className={s.note}>{t("areaNote")}</p>
      <p className={s.label}>{t("radius")}</p>
      <div className={s.chips}>
        {RADII.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={p.radius === r}
            onClick={() => p.setRadius(r)}
          >
            {distance(r)}
          </button>
        ))}
      </div>
      <p className={s.label}>{t("kinds")}</p>
      <div className={s.chips}>
        {KIND_NAMES.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={p.kinds.includes(k)}
            onClick={() => p.toggleKind(k)}
          >
            {t(`kind.${k}`)}
          </button>
        ))}
      </div>
      <div className={s.stats}>
        <div>
          <b>{p.inCircle.length}</b>
          <span>{t("foundHere")}</span>
        </div>
        <div>
          <b>{fresh}</b>
          <span>{t("notSeen")}</span>
        </div>
        <div>
          <b>{p.kinds.length * 20}</b>
          <span>{t("atMost")}</span>
        </div>
      </div>
      <button
        type="button"
        className={s.go}
        onClick={p.search}
        disabled={p.busy || p.kinds.length === 0 || !p.hasKey}
      >
        {p.busy ? t("searching") : t("search")}
      </button>
      <p className={s.small}>
        {p.hasKey ? t("cost", { n: p.kinds.length }) : t("problem.noKey")}
      </p>
    </div>
  );
}

function SwipeStep({ p, t }: { p: Pick; t: T }) {
  const top = p.top;
  const next = p.deck[1];
  const total = p.state.candidates.length;
  const others = p.state.people.filter((x) => !x.me);
  return (
    <div className={s.swipe}>
      <p className={s.kicker}>
        {t("step", { n: 2 })} <i>·</i> {t("left", { n: p.deck.length, total })}
      </p>
      <div className={s.deck}>
        {top ? (
          <>
            {next && <Card key={next.id} p={p} id={next.id} t={t} under />}
            <Card key={top.id} p={p} id={top.id} t={t} />
          </>
        ) : (
          <div className={s.empty}>
            <p className={s.kicker}>{t("allDone")}</p>
            <h2 className={s.big}>
              {t("matchCount", { n: p.lists.both.length })}
            </h2>
            <p className={s.note}>{t("allDoneNote")}</p>
            <div className={s.row}>
              <button
                type="button"
                className={s.ghost}
                onClick={() => p.setTab("area")}
              >
                {t("movePin")}
              </button>
              <button
                type="button"
                className={s.go}
                onClick={() => p.setTab("matches")}
              >
                {t("seeMatches")}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className={s.acts}>
        <button
          type="button"
          className={s.undo}
          aria-label={t("undo")}
          onClick={p.undo}
          disabled={!p.canUndo}
        >
          {Icon.undo}
        </button>
        {(["no", "must", "yes"] as const).map((v) => (
          <button
            key={v}
            type="button"
            className={s.act}
            data-v={v}
            aria-label={t(`vote.${v}`)}
            disabled={!top}
            onClick={() =>
              window.dispatchEvent(new CustomEvent("pick-fly", { detail: v }))
            }
          >
            {Icon[v]}
          </button>
        ))}
      </div>
      <p className={s.keys}>
        {t("keys")}{" "}
        {others.length > 0 &&
          t("hidden", { name: others.map((o) => o.name).join(", ") })}
      </p>
    </div>
  );
}

const STAMP: Record<Vote, string> = { yes: "yes", no: "no", must: "must" };

/** One place to swipe. Dragged, it leans; let go far enough, it flies off and votes. */
function Card({
  p,
  id,
  t,
  under = false,
}: {
  p: Pick;
  id: string;
  t: T;
  under?: boolean;
}) {
  const el = useRef<HTMLElement>(null);
  const info = p.infos[id];
  const c = p.state.candidates.find((x) => x.id === id);
  const at = p.spotOf(id);
  const [lean, setLean] = useState<{ x: number; y: number } | null>(null);
  const [gone, setGone] = useState<Vote | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const { cast } = p;

  const fly = useCallback(
    (v: Vote) => {
      if (gone) return;
      setGone(v);
      window.setTimeout(() => cast(v), 240);
    },
    [gone, cast],
  );

  useEffect(() => {
    if (under) return;
    const on = (e: Event) => fly((e as CustomEvent<Vote>).detail);
    window.addEventListener("pick-fly", on);
    return () => window.removeEventListener("pick-fly", on);
  }, [under, fly]);

  const dx = lean?.x ?? 0;
  const dy = lean?.y ?? 0;
  const style: CSSProperties = gone
    ? {
        transform: `translate(${gone === "yes" ? 140 : gone === "no" ? -140 : 0}%, ${gone === "must" ? -120 : 0}%) rotate(${gone === "yes" ? 18 : gone === "no" ? -18 : 0}deg)`,
        opacity: 0,
      }
    : lean
      ? { transform: `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)` }
      : {};
  const show = (v: Vote) =>
    gone === v
      ? 1
      : v === "yes"
        ? Math.max(0, Math.min(1, dx / 90))
        : v === "no"
          ? Math.max(0, Math.min(1, -dx / 90))
          : Math.max(0, Math.min(1, -dy / 90 - Math.abs(dx) / 120));

  const far = at ? metres([p.pin.lng, p.pin.lat], [at.lng, at.lat]) : null;
  const dir = at ? bearing(p.pin, at) : 0;

  return (
    <article
      ref={el}
      className={s.card}
      data-under={under || undefined}
      data-moving={lean && !gone ? true : undefined}
      data-gone={gone ? true : undefined}
      style={style}
      aria-hidden={under || undefined}
      onPointerDown={(e) => {
        if (under || gone || (e.target as HTMLElement).closest("a")) return;
        start.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        setLean({
          x: e.clientX - start.current.x,
          y: e.clientY - start.current.y,
        });
      }}
      onPointerUp={(e) => {
        if (!start.current) return;
        const x = e.clientX - start.current.x;
        const y = e.clientY - start.current.y;
        start.current = null;
        if (x > 100) fly("yes");
        else if (x < -100) fly("no");
        else if (y < -110 && Math.abs(x) < 80) fly("must");
        else setLean(null);
      }}
      onPointerCancel={() => {
        start.current = null;
        setLean(null);
      }}
    >
      <div className={s.photo}>
        {info?.photo ? (
          // Google's photo, shown as Google sends it.
          // biome-ignore lint/performance/noImgElement: a Google photo URL, not ours to optimise
          <img src={info.photo} alt="" draggable={false} />
        ) : (
          <span className={s.noPhoto}>{info ? info.name.charAt(0) : ""}</span>
        )}
        {(Object.keys(STAMP) as Vote[]).map((v) => (
          <span
            key={v}
            className={s.stamp}
            data-v={v}
            style={{ opacity: show(v) }}
          >
            {t(`vote.${v}`)}
          </span>
        ))}
        <span className={s.credit}>
          {info?.photoBy &&
            (info.photoBy.uri ? (
              <a href={info.photoBy.uri} target="_blank" rel="noreferrer">
                {info.photoBy.name}
              </a>
            ) : (
              info.photoBy.name
            ))}
          <span className={s.google}>Google Maps</span>
        </span>
      </div>
      <div className={s.info}>
        <p className={s.kicker}>
          {c && t(`kind.${c.kind}`)}
          {info?.type && (
            <>
              {" "}
              <i>·</i> {info.type}
            </>
          )}
        </p>
        <h2>{info?.name ?? t("loading")}</h2>
        <div className={s.facts}>
          {info?.rating != null && (
            <span>
              <b>★</b> {info.rating.toFixed(1)} · {count(info.reviews)}
            </span>
          )}
          {far !== null && (
            <span>
              <b className={s.arrow} style={{ transform: `rotate(${dir}deg)` }}>
                ↑
              </b>{" "}
              {t("fromPin", { d: distance(far), dir: dirOf(dir) })}
            </span>
          )}
        </div>
        {info?.summary && <p>{info.summary}</p>}
        {info?.mapsUri && (
          <a
            className={s.maps}
            href={info.mapsUri}
            target="_blank"
            rel="noreferrer"
          >
            {t("openMaps")} ↗
          </a>
        )}
      </div>
    </article>
  );
}

function MatchesStep({
  p,
  t,
  numbers,
}: {
  p: Pick;
  t: T;
  numbers: Map<string, number>;
}) {
  const others = p.state.people.filter((x) => !x.me);
  const filters: { key: string; label: string }[] = [
    {
      key: "both",
      label: others.length ? t("filter.both") : t("filter.liked"),
    },
    ...(others.length
      ? [
          { key: "mine", label: t("filter.mine") },
          ...others.map((o) => ({
            key: o.email,
            label: t("filter.only", { name: o.name }),
          })),
          { key: "wait", label: t("filter.wait") },
        ]
      : []),
  ];
  const days = p.filter === "both" ? roughDays(p.areas) : [];
  const name = (id: string) => p.infos[id]?.name ?? "…";
  const pinless = p.list.filter((c) => !numbers.has(c.id));
  const apart = p.areas.filter((a) => a.ids.length === 1).flatMap((a) => a.ids);
  return (
    <div className={s.scroll}>
      <p className={s.kicker}>{t("step", { n: 3 })}</p>
      <h2 className={s.big}>
        {p.filter === "both"
          ? t(others.length ? "bothWant" : "youWant", { n: p.list.length })
          : (filters.find((f) => f.key === p.filter)?.label ?? "")}
      </h2>
      {filters.length > 1 && (
        <div className={s.filters}>
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={p.filter === f.key}
              onClick={() => p.setFilter(f.key)}
            >
              {f.label} {p.lists[f.key]?.length ?? 0}
            </button>
          ))}
        </div>
      )}
      {p.list.length === 0 && <p className={s.note}>{t("noneYet")}</p>}
      {p.areas
        .filter((a) => a.ids.length > 1)
        .map((a) => (
          <div key={a.ids[0]} className={s.group}>
            <h3>
              {areaName(a.ids, p.infos, t)}
              <span>
                {t("places", { n: a.ids.length })} ·{" "}
                {t(`time.${areaTime(a.ids.length)}`)}
              </span>
            </h3>
            <Rows ids={a.ids} p={p} t={t} numbers={numbers} />
          </div>
        ))}
      {apart.length > 0 && (
        <div className={s.group}>
          <h3>
            {t("apart")}
            <span>{t("places", { n: apart.length })}</span>
          </h3>
          <Rows ids={apart} p={p} t={t} numbers={numbers} />
        </div>
      )}
      {pinless.length > 0 && (
        <ul className={s.list}>
          {pinless.map((c) => (
            <li key={c.id}>
              <span className={s.nm}>{name(c.id)}</span>
            </li>
          ))}
        </ul>
      )}
      {days.length > 1 && (
        <>
          <hr className={s.rule} />
          <p className={s.kicker}>{t("roughDays")}</p>
          <p className={s.small}>{t("roughNote")}</p>
          <div className={s.days}>
            {days.map((d, i) => (
              <div key={d[0]} className={s.day}>
                <p className={s.kicker}>
                  {t("dayN", { n: String.fromCharCode(65 + i) })} <i>·</i>{" "}
                  {t("places", { n: d.length })}
                </p>
                <p>{d.map(name).join(" · ")}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Rows({
  ids,
  p,
  t,
  numbers,
}: {
  ids: string[];
  p: Pick;
  t: T;
  numbers: Map<string, number>;
}) {
  return (
    <ul className={s.list}>
      {ids.map((id) => {
        const must = isMust(p.state, id);
        return (
          <li key={id}>
            <button
              type="button"
              aria-current={p.selected === id}
              onClick={() => p.setSelected(id)}
            >
              <span className={s.n}>{numbers.get(id)}</span>
              <span className={s.nm}>{p.infos[id]?.name ?? "…"}</span>
              <span className={s.t} data-must={must || undefined}>
                {must ? `★ ${t("vote.must")}` : (p.infos[id]?.type ?? "")}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
