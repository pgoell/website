"use client";

import { useEffect, useRef, useState } from "react";
import { lcg } from "@/lib/viewfinder/color";
import s from "./viewfinder.module.css";

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Commit histogram: 64 days, one bar per day. Sample shape. */
export function CommitHistogram() {
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
    for (let i = 0; i < 64; i++) {
      const wk = i % 7 > 4 ? 0.25 : 1;
      const v = Math.max(
        0,
        (Math.sin(i / 6) + 1.2) * r() * wk * 0.5 + (i > 52 ? 0.35 : 0),
      );
      const bh = Math.min(1, v) * (H - 6);
      x.fillRect(2 + i * 5.08, H - bh, 3.6, bh);
    }
  }, []);
  return <canvas ref={ref} className={s.hist} width={328} height={100} />;
}

const SEGMENTS = 22;
const meterClass = (i: number, level: number) =>
  i < level ? (i >= 19 ? s.pk : i >= 15 ? s.hot : s.on) : undefined;

/** Recording level meters for the music corner; they idle while the page is scrolled or hidden. */
export function LevelMeters() {
  const [levels, setLevels] = useState<[number, number]>([13, 12]);
  useEffect(() => {
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
  }, []);
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

const POMODORO = 1500;

/** Exposure scale: progress through the current 25 minute Pomodoro. */
export function FocusScale({ label }: { label: string }) {
  const [left, setLeft] = useState(18 * 60 + 42);
  useEffect(() => {
    const id = window.setInterval(
      () => setLeft((l) => Math.max(0, l - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
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
        <g
          className={s.needle}
          transform={`translate(${5 + ((POMODORO - left) / POMODORO) * 250} 0)`}
        >
          <path d="M0 22 L-4 16 L4 16 Z" fill="#f08a00" />
          <rect x="-1" y="2" width="2" height="14" fill="#f08a00" />
        </g>
      </svg>
      <div className={s.v}>
        {label} {mm}:{ss}
      </div>
    </>
  );
}
