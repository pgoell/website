"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { locales } from "@/i18n/config";
import type { GithubStats } from "@/lib/stats/github";
import type { Book } from "@/lib/stats/kasten";
import { GITHUB } from "@/lib/viewfinder/menu";
import { berlinZoneName, sinceLabel, TIME_ZONE } from "@/lib/viewfinder/time";
import { conditionOf, type SceneWeather } from "@/lib/weather/weather";
import { cls, cx } from "./cx";
import type { Scene } from "./gelnhausen-engine";
import { GelnhausenScene } from "./gelnhausen-scene";
import {
  CommitHistogram,
  DayScale,
  LevelMeters,
  useNowPlaying,
} from "./readouts";
import type { DisplayMode } from "./use-viewfinder";
import s from "./viewfinder.module.css";

interface Props {
  at: Date | null;
  /** Degrees Celsius, null when the weather is unavailable. */
  temperature: number | null;
  weather: SceneWeather | null;
  mode: DisplayMode;
  onShoot: (target: string) => void;
  onMenu: () => void;
  onCycleMode: () => void;
  fnRef: React.RefObject<Array<() => void>>;
  onPowerOn: () => void;
  github: GithubStats | null;
  /** The book open in Kasten; the reading line is left out without one. */
  book: Book | null;
  /** Opens or closes the panel that pins day, time and weather. */
  onScene: () => void;
  sceneOpen: boolean;
  scenePanel: React.ReactNode;
  /** Ambient sound that follows the weather; off until pressed. */
  soundOn: boolean;
  onSound: () => void;
}

type Guide = { text: string; key: string } | null;

/** The viewfinder: the Gelnhausen scene with the camera's on-screen display over it. */
export function Evf({
  at,
  temperature,
  weather,
  mode,
  onShoot,
  onMenu,
  onCycleMode,
  fnRef,
  onPowerOn,
  github,
  book,
  onScene,
  sceneOpen,
  scenePanel,
  soundOn,
  onSound,
}: Props) {
  const t = useTranslations("home");
  const roles = t.raw("roles") as string[];
  const [roleIdx, setRoleIdx] = useState(0);
  const locale = useLocale();
  const other = locale === "en" ? "de" : "en";
  const evfRef = useRef<HTMLElement | null>(null);
  const afRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLSpanElement | null>(null);
  const nameRef = useRef<HTMLHeadingElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const lensRef = useRef<Scene | null>(null);
  const poweredRef = useRef(false);
  const [guide, setGuide] = useState<Guide>(null);
  const [clock, setClock] = useState({ time: "--:--", zone: "CET" });
  const listening = useNowPlaying();
  const track = listening?.track ?? null;
  const trackHref = track?.url ?? listening?.profile ?? undefined;
  const lastPush = github?.lastPush;
  const repo = lastPush?.repo ?? "--";
  const [since, setSince] = useState("--");

  // clock readout
  /* role line under the name cycles; held still for reduced motion */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(
      () => setRoleIdx((i) => (i + 1) % roles.length),
      2400,
    );
    return () => window.clearInterval(id);
  }, [roles.length]);

  useEffect(() => {
    if (at === null) return;
    setClock({
      time: at.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: TIME_ZONE,
      }),
      zone: berlinZoneName(at),
    });
  }, [at]);

  // last push readout, set on the client so the server render cannot go stale
  useEffect(() => {
    if (lastPush) setSince(sinceLabel(lastPush.at, new Date()));
  }, [lastPush]);

  /* ---------- AF frame ---------- */
  const box = useCallback(
    (X: number, Y: number, w: number, h: number, lock: boolean) => {
      const af = afRef.current;
      if (!af) return;
      af.style.transform = `translate(${X}px,${Y}px)`;
      af.style.width = `${w}px`;
      af.style.height = `${h}px`;
      af.classList.toggle(cls(s.lock), lock);
      dotRef.current?.classList.toggle(cls(s.on), lock);
    },
    [],
  );
  const place = useCallback(
    (el: Element, pad: number) => {
      const evf = evfRef.current;
      if (!evf) return;
      const b = el.getBoundingClientRect();
      const v = evf.getBoundingClientRect();
      box(
        b.left - v.left - pad / 2,
        b.top - v.top - pad / 2,
        b.width + pad,
        b.height + pad,
        true,
      );
    },
    [box],
  );
  const home = useCallback(() => {
    if (nameRef.current) place(nameRef.current, 26);
  }, [place]);

  const showGuide = useCallback((el: HTMLElement | null) => {
    const text = el?.dataset.g;
    const key = el?.dataset.gk;
    setGuide((g) => {
      if (!text) return null;
      return g && g.text === text ? g : { text, key: key ?? "" };
    });
  }, []);

  const target = (el: EventTarget | null) =>
    el instanceof Element
      ? el.closest<HTMLElement>("[data-g],[data-af]")
      : null;
  const padFor = (el: HTMLElement) =>
    Number(el.dataset.af ?? (el.classList.contains(cls(s.ro)) ? 10 : 18));

  const onMove = (e: React.MouseEvent | React.PointerEvent) => {
    if (!poweredRef.current) return;
    const el = target(e.target);
    if (el) {
      place(el, padFor(el));
      showGuide(el);
      lensRef.current?.unfocus();
    } else {
      const v = evfRef.current?.getBoundingClientRect();
      if (v) {
        box(e.clientX - v.left - 45, e.clientY - v.top - 31, 90, 62, false);
        // nothing highlighted: the frame pulls focus to whatever stands under it
        lensRef.current?.focusAt(e.clientX - v.left, e.clientY - v.top);
      }
      showGuide(null);
    }
  };
  // phones have no hover: a tap on the scene focuses there, as on a phone camera
  const onTap = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") onMove(e);
  };
  const onLeave = () => {
    home();
    showGuide(null);
    lensRef.current?.unfocus();
  };
  // keyboard users get the same focus frame and help line
  const onFocus = (e: React.FocusEvent) => {
    const el = target(e.target);
    if (!poweredRef.current || !el) return;
    place(el, padFor(el));
    showGuide(el);
    lensRef.current?.unfocus();
  };

  useEffect(() => {
    const onResize = () => home();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [home]);

  /* ---------- power on: exposure settles, readouts pop in, AF hunts then locks on the name ---------- */
  useEffect(() => {
    const timers: number[] = [];
    let cancelled = false;
    const powerOn = () => {
      const evf = evfRef.current;
      const af = afRef.current;
      const scene = sceneRef.current;
      if (cancelled || !evf || !af || !scene) return;
      const v = evf.getBoundingClientRect();
      af.style.transition = "none";
      box(v.width * 0.55 - 60, v.height * 0.45 - 42, 120, 84, false);
      poweredRef.current = true;
      onPowerOn();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        requestAnimationFrame(home);
        return;
      }
      const N = 18;
      for (let k = 0; k <= N; k++) {
        timers.push(
          window.setTimeout(() => {
            const e = 1 - (1 - k / N) ** 3;
            scene.style.opacity =
              k === N
                ? ""
                : (k < 3 ? k * 0.45 : Math.min(1, 0.9 + 0.1 * e)).toFixed(2);
            scene.style.transform =
              k === N ? "" : `scale(${(1.04 - 0.04 * e).toFixed(4)})`;
          }, k * 45),
        );
      }
      requestAnimationFrame(() => af.classList.add(cls(s.hunt)));
      timers.push(
        window.setTimeout(() => {
          af.style.transition = "";
          af.classList.remove(cls(s.hunt));
          home();
        }, 900),
      );
      timers.push(
        window.setTimeout(() => {
          af.style.transition = "none";
          home();
          requestAnimationFrame(() => {
            af.style.transition = "";
          });
        }, 1700),
      );
    };
    document.fonts.ready.then(() => {
      timers.push(window.setTimeout(powerOn, 120));
    });
    return () => {
      cancelled = true;
      for (const id of timers) clearTimeout(id);
    };
  }, [box, home, onPowerOn]);

  /* ---------- Fn row ---------- */
  const fn: Array<{
    id: string;
    href: string;
    target: string;
    work?: boolean;
  }> = [
    { id: "work", href: "#work", target: "#work", work: true },
    { id: "writing", href: "#more", target: "#more" },
  ];
  fnRef.current = fn.map((f) => () => onShoot(f.target));
  const shootLink = (targetId: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onShoot(targetId);
  };

  const ro = (key: string) => ({
    "data-g": t(`ro.${key}.g`),
    "data-gk": t(`ro.${key}.k`),
  });

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the focus frame follows the pointer; keyboard focus is handled by onFocus
    <section
      ref={evfRef}
      className={cx(s.evf, mode === 1 && s.values, mode === 2 && s.clean)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onPointerDown={onTap}
      onFocus={onFocus}
    >
      <GelnhausenScene
        at={at}
        weather={weather}
        hostRef={sceneRef}
        sceneRef={lensRef}
        className={s.scene}
        label={t("sceneLabel")}
      />
      <div className={s.shade} />
      <div className={s.pix} />

      <div className={s.osd}>
        <div className={cx(s.bar, s.t)}>
          <div className={s.grp}>
            <a
              className={cx(s.ro, s.home)}
              href={`/${locale}`}
              aria-label="pgoell.com"
              onClick={(e) => {
                e.preventDefault();
                window.location.reload();
              }}
              data-af="10"
            >
              <span className={s.v}>
                <span className={s.mode}>
                  pg
                  <i />
                </span>
              </span>
            </a>
            <a
              className={cx(s.ro, s.lang)}
              href={`/${other}`}
              hrefLang={other}
              {...ro("lang")}
              aria-label={t("ro.lang.k")}
            >
              <span className={s.v}>
                {locales.map((l) => (
                  <span key={l} className={cx(l === locale && s.cur)}>
                    {l.toUpperCase()}
                  </span>
                ))}
              </span>
              <span className={cx(s.l, s.hideM)}>{t("ro.lang.l")}</span>
            </a>
          </div>
          <button
            type="button"
            className={cx(s.ro, s.hideM, s.gps)}
            data-af="10"
            onClick={() => onShoot("#work")}
          >
            <span className={s.v}>
              <svg className={s.i} viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 14.5s-4.5-4.6-4.5-8a4.5 4.5 0 0 1 9 0c0 3.4-4.5 8-4.5 8z" />
                <circle cx="8" cy="6.5" r="1.5" />
              </svg>
              Gelnhausen <span className={s.soft}>50.20N 9.19E</span>
            </span>
            <span className={s.l}>{t("ro.gps.l")}</span>
          </button>
          <div className={s.grp}>
            <button
              type="button"
              className={cx(s.ro, s.snd, soundOn && s.on)}
              data-af="10"
              aria-pressed={soundOn}
              aria-label={t("ro.sound.k")}
              onClick={onSound}
            >
              <span className={s.v}>
                <svg className={s.i} viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M2.5 6h2.4L8.5 3v10L4.9 10H2.5z" />
                  {soundOn ? (
                    <path d="M10.6 5.6a3.4 3.4 0 0 1 0 4.8M12.6 3.8a6 6 0 0 1 0 8.4" />
                  ) : (
                    <path d="M10.8 6.2l3.6 3.6M14.4 6.2l-3.6 3.6" />
                  )}
                </svg>
                <span className={s.hideM}>{soundOn ? "ON" : "OFF"}</span>
              </span>
              <span className={cx(s.l, s.hideM)}>{t("ro.sound.l")}</span>
            </button>
            <button
              type="button"
              className={cx(s.ro, s.pick, s.hideM)}
              {...ro("weather")}
              data-scene=""
              aria-expanded={sceneOpen}
              onClick={onScene}
            >
              <span className={s.v}>
                <svg className={s.i} viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4.5 12.5h7.2a2.8 2.8 0 0 0 .3-5.6 3.8 3.8 0 0 0-7.3.8 2.4 2.4 0 0 0-.2 4.8z" />
                </svg>
                {temperature === null ? "--" : `${Math.round(temperature)}°`}
              </span>
              <span className={s.l}>
                {t("ro.weather.l", {
                  cond: weather
                    ? t(`ro.weather.c.${conditionOf(weather)}`)
                    : "--",
                })}
              </span>
            </button>
            <button
              type="button"
              className={cx(s.ro, s.pick)}
              data-af="10"
              data-scene=""
              aria-expanded={sceneOpen}
              onClick={onScene}
            >
              <span className={s.v}>{clock.time}</span>
              <span className={s.l}>
                {t("ro.clock.l", { zone: clock.zone })}
              </span>
            </button>
          </div>
        </div>
        <div className={cx(s.corner, s.c1)} />
        <div className={cx(s.corner, s.c2)} />
        <div className={cx(s.corner, s.c3)} />
        <div className={cx(s.corner, s.c4)} />

        <div className={s.col}>
          <div className={cx(s.box, s.ro)} {...ro("commits")}>
            <div className={s.hd}>
              <span>{t("ro.commits.hd")}</span>
              <span>{t("ro.commits.span")}</span>
            </div>
            <CommitHistogram weeks={github?.weeks} />
          </div>
          <a
            className={cx(s.box, s.ro)}
            href={trackHref}
            target="_blank"
            rel="noopener noreferrer"
            data-af="10"
          >
            <div className={s.hd}>
              <span>
                {t(
                  track && !track.playing ? "ro.playing.last" : "ro.playing.hd",
                )}
              </span>
              <span>{t("ro.playing.lvl")}</span>
            </div>
            <LevelMeters live={track?.playing ?? false} />
            <div className={s.trk}>
              {track ? (
                <>
                  {track.title} <em>{track.artist}</em>
                </>
              ) : (
                "--"
              )}
            </div>
          </a>
          {book && (
            <div className={cx(s.box, s.ro)} {...ro("reading")}>
              <div className={s.hd}>
                <span>{t("ro.playing.reading")}</span>
                {book.progress !== null && (
                  <span>{Math.round(book.progress * 100)}%</span>
                )}
              </div>
              <div className={s.book}>
                {book.title}
                {book.author && <em>{book.author}</em>}
              </div>
              {book.progress !== null && (
                <div className={s.pbar}>
                  <b style={{ width: `${book.progress * 100}%` }} />
                </div>
              )}
            </div>
          )}
        </div>
        <div className={cx(s.bar, s.b)}>
          <div className={cx(s.grp, s.hideM)}>
            <span ref={dotRef} className={s.fdot} />
            <a
              className={cx(s.ro, s.big, s.hideM)}
              href={lastPush ? `${GITHUB}/${repo}` : GITHUB}
              target="_blank"
              rel="noopener noreferrer"
              {...ro("focus")}
            >
              <span className={s.v}>
                AF-C <span style={{ fontWeight: 500 }}>{repo}</span>
              </span>
              <span className={s.l}>{t("ro.focus.l")}</span>
            </a>
            <a
              className={cx(s.ro, s.big)}
              href={
                lastPush
                  ? `${GITHUB}/${lastPush.repo}/commit/${lastPush.sha}`
                  : GITHUB
              }
              target="_blank"
              rel="noopener noreferrer"
              data-af="10"
            >
              <span className={s.v}>
                {since} <small>{lastPush?.sha.slice(0, 7)}</small>
              </span>
              <span className={s.l}>{t("ro.lastCommit.l")}</span>
            </a>
          </div>
          <div className={cx(s.ro, s.scale)} data-af="10">
            <DayScale
              at={at}
              sunset={t("ro.timer.sunset")}
              sunrise={t("ro.timer.sunrise")}
            />
          </div>
          <div className={s.grp}>
            <div className={cx(s.ro, s.big)} {...ro("body")}>
              <div className={s.v}>
                35<span style={{ fontSize: 15 }}>mm</span>
              </div>
              <div className={s.l}>{t("ro.body.l")}</div>
            </div>
            <button
              type="button"
              className={cx(s.disp, s.hideM)}
              {...ro("disp")}
              onClick={onCycleMode}
              aria-label={`DISP ${mode + 1}/3`}
            >
              DISP
            </button>
          </div>
        </div>
      </div>
      {scenePanel}
      <div className={cx(s.guide, guide && s.on)} aria-live="polite">
        <small>{guide?.key || t("guideDefault")}</small>
        <span>{guide?.text}</span>
      </div>

      <div className={s.copy}>
        <div>
          <h1 ref={nameRef} className={s.name} data-af="18">
            <span>Pascal</span> <span>Goellner</span>{" "}
            <span className={s.role}>
              {roles.map((r, i) => (
                <span
                  key={r}
                  className={i === roleIdx ? s.roleOn : undefined}
                  aria-hidden={i !== roleIdx}
                >
                  {r}
                </span>
              ))}
            </span>
          </h1>
        </div>
        <nav className={s.fn} aria-label={t("mainNav")}>
          {fn.map((f, i) => (
            <a
              key={f.id}
              href={f.href}
              className={f.work ? s.work : undefined}
              data-af="10"
              onClick={shootLink(f.target)}
            >
              <small>0{i + 1}</small>
              <strong>{t(`fn.${f.id}`)}</strong>
            </a>
          ))}
          <button
            type="button"
            className={s.mbtn}
            data-af="10"
            onClick={onMenu}
            aria-haspopup="dialog"
          >
            <small>BTN</small>
            <strong>{t("fn.menu")}</strong>
          </button>
        </nav>
        <div className={s.hint}>
          <span>
            <kbd>M</kbd>
            {t("hint.menu")}
          </span>
          <span>
            <kbd>Ctrl K</kbd>
            {t("hint.search")}
          </span>
          <span>
            <kbd>1</kbd>
            {t("hint.to")} <kbd>{fn.length}</kbd>
            {t("hint.shoot")}
          </span>
          <span>
            <kbd>D</kbd>
            {t("hint.display")}
          </span>
        </div>
      </div>
      <div ref={afRef} className={s.af} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
    </section>
  );
}
