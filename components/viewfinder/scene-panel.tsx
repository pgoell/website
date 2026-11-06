"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { berlinParts } from "@/lib/viewfinder/time";
import { type Condition, PRESETS } from "@/lib/weather/weather";
import { cx } from "./cx";
import type { SceneSetting } from "./use-viewfinder";
import s from "./viewfinder.module.css";

const CONDITIONS = Object.keys(PRESETS) as Condition[];
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const toHhmm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Lets a visitor pick the day, time and weather the Gelnhausen scene shows. */
export function ScenePanel({
  at,
  scene,
  onChange,
  onClose,
}: {
  at: Date | null;
  scene: SceneSetting;
  onChange: (next: Partial<SceneSetting>) => void;
  onClose: () => void;
}) {
  const t = useTranslations("home");
  const ref = useRef<HTMLDivElement | null>(null);
  const now = berlinParts(at ?? new Date());
  const live = !scene.date && !scene.time && !scene.weather;

  // Escape or a press outside closes it; the readouts that open it toggle it themselves
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (!ref.current?.contains(el) && !el?.closest?.("[data-scene]"))
        onClose();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    ref.current?.querySelector<HTMLElement>("input")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={s.scenePanel}
      role="dialog"
      aria-label={t("scene.title")}
    >
      <div className={s.sceneHd}>
        <span>{t("scene.title")}</span>
        <button type="button" onClick={onClose} aria-label={t("scene.close")}>
          ×
        </button>
      </div>
      <label className={s.sceneRow}>
        <span>{t("scene.date")}</span>
        <input
          type="date"
          value={now.date}
          onChange={(e) => onChange({ date: e.target.value || null })}
        />
      </label>
      <label className={s.sceneRow}>
        <span>
          {t("scene.time")} <b>{now.time}</b>
        </span>
        <input
          type="range"
          min={0}
          max={1435}
          step={5}
          value={toMinutes(now.time)}
          onChange={(e) => onChange({ time: toHhmm(Number(e.target.value)) })}
        />
      </label>
      <div className={s.sceneRow}>
        <span>{t("scene.weather")}</span>
        <div className={s.sceneChips}>
          <button
            type="button"
            className={cx(!scene.weather && s.on)}
            aria-pressed={!scene.weather}
            onClick={() => onChange({ weather: null })}
          >
            {t("scene.live")}
          </button>
          {CONDITIONS.map((c) => (
            <button
              key={c}
              type="button"
              className={cx(scene.weather === c && s.on)}
              aria-pressed={scene.weather === c}
              onClick={() => onChange({ weather: c })}
            >
              {t(`ro.weather.c.${c}`)}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className={s.sceneReset}
        disabled={live}
        onClick={() => onChange({ date: null, time: null, weather: null })}
      >
        {t("scene.reset")}
      </button>
    </div>
  );
}
