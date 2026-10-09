"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NowPlaying } from "@/lib/stats/spotify";
import { lcg } from "@/lib/viewfinder/color";
import { sunCrossings } from "@/lib/viewfinder/sun";
import { TIME_ZONE } from "@/lib/viewfinder/time";
import s from "./viewfinder.module.css";

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Commit histogram: 52 weeks, one bar per week. A sample shape until real weeks arrive. */
export function CommitHistogram({ weeks }: { weeks?: number[] }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    const x = c?.getContext("2d");
    if (!c || !x) return;
    const r = lcg(7);
    const W = c.width;
    const H = c.height;
    x.fillStyle = "rgba(255,255,255,.16)";
    for (const k of [1, 2, 3]) x.fillRect(Math.round((W * k) / 4), 0, 1, H);
    x.fillStyle = "rgba(255,255,255,.9)";
    const max = weeks ? Math.max(1, ...weeks) : 1;
    for (let i = 0; i < 52; i++) {
      const wk = i % 7 > 4 ? 0.25 : 1;
      const v = weeks
        ? Math.sqrt((weeks[i] ?? 0) / max)
        : Math.max(
            0,
            (Math.sin(i / 6) + 1.2) * r() * wk * 0.5 + (i > 42 ? 0.35 : 0),
          );
      const bh = Math.min(1, v) * (H - 6);
      x.fillRect(2 + i * 6.25, H - bh, 4.4, bh);
    }
  }, [weeks]);
  return <canvas ref={ref} className={s.hist} width={328} height={100} />;
}

const SEGMENTS = 22;
const meterClass = (i: number, level: number) =>
  i < level ? (i >= 19 ? s.pk : i >= 15 ? s.hot : s.on) : undefined;

/** Recording level meters for the music corner; they idle while the page is scrolled or hidden, and drop when nothing plays. */
export function LevelMeters({ live = true }: { live?: boolean }) {
  const [levels, setLevels] = useState<[number, number]>([13, 12]);
  useEffect(() => {
    if (!live) {
      setLevels([0, 0]);
      return;
    }
    if (reducedMotion()) return;
    const tick = () => {
      if (document.hidden || window.scrollY > window.innerHeight) return;
      setLevels([
        Math.floor(9 + Math.random() * 9),
        Math.floor(9 + Math.random() * 9 - 1),
      ]);
    };
    const id = window.setInterval(tick, 180);
    return () => clearInterval(id);
  }, [live]);
  return (
    <div className={s.meter}>
      {levels.map((lv, k) => (
        <MeterRow
          key={k === 0 ? "L" : "R"}
          label={k === 0 ? "L" : "R"}
          level={lv}
        />
      ))}
    </div>
  );
}

function MeterRow({ label, level }: { label: string; level: number }) {
  return (
    <>
      <span>{label}</span>
      <div className={s.segs}>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed segment strip
          <i key={i} className={meterClass(i, level)} />
        ))}
      </div>
    </>
  );
}

/** Exposure scale: how far the day (or the night) has run, and when the sun next crosses the horizon. */
export function DayScale({
  at,
  sunset,
  sunrise,
}: {
  at: Date | null;
  sunset: string;
  sunrise: string;
}) {
  const sun = useMemo(() => (at ? sunCrossings(at) : null), [at]);
  const done =
    at && sun
      ? (at.getTime() - sun.last.getTime()) /
        (sun.next.getTime() - sun.last.getTime())
      : 0;
  const next = sun
    ? sun.next.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: TIME_ZONE,
      })
    : "--:--";
  return (
    <>
      <svg className={s.ticks} viewBox="0 0 260 22" aria-hidden="true">
        {Array.from({ length: 26 }, (_, i) => {
          const X = 5 + i * 10;
          const big = i % 5 === 0;
          return (
            <line
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed tick scale
              key={i}
              x1={X}
              x2={X}
              y1={big ? 4 : 9}
              y2={15}
              stroke="#fff"
              strokeWidth={big ? 1.5 : 1}
              opacity={big ? 0.95 : 0.6}
            />
          );
        })}
        <g className={s.needle} transform={`translate(${5 + done * 250} 0)`}>
          <path d="M0 22 L-4 16 L4 16 Z" fill="#f08a00" />
          <rect x="-1" y="2" width="2" height="14" fill="#f08a00" />
        </g>
      </svg>
      <div className={s.v}>
        {sun?.up === false ? sunrise : sunset} {next}
      </div>
    </>
  );
}

/** What plays on Spotify, refreshed every minute while the tab is visible. */
export function useNowPlaying() {
  const [track, setTrack] = useState<NowPlaying | null>(null);
  useEffect(() => {
    let on = true;
    const load = () => {
      if (document.hidden) return;
      fetch("/api/now-playing")
        .then((r) => r.json())
        .then((t: NowPlaying | null) => on && setTrack(t))
        .catch(() => {});
    };
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, []);
  return track;
}
