"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MenuAction, MenuTabDef } from "@/lib/viewfinder/menu";
import { PROJECTS } from "@/lib/viewfinder/projects";
import { berlinInstant } from "@/lib/viewfinder/time";
import { type Condition, PRESETS } from "@/lib/weather/weather";
import { cls } from "./cx";
import s from "./viewfinder.module.css";

export type DisplayMode = 0 | 1 | 2;

/** What a visitor sets in the scene panel; null parts follow the live clock or the live weather. */
export interface SceneSetting {
  date: string | null;
  time: string | null;
  weather: Condition | null;
}

export interface MenuRequest {
  tab: MenuTabDef["id"] | "search";
  group?: number;
  query?: string;
}

const COUNT = PROJECTS.length;

/** Page state for the viewfinder home: clock, shutter, display mode, menu and playback. */
export function useViewfinder() {
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();

  const [at, setAt] = useState<Date | null>(null);
  const [scene, setSceneState] = useState<SceneSetting>({
    date: null,
    time: null,
    weather: null,
  });
  const [sceneOpen, setSceneOpen] = useState(false);
  const [mode, setMode] = useState<DisplayMode>(0);
  const [shots, setShots] = useState(1284);
  const [menu, setMenu] = useState<MenuRequest | null>(null);
  const [playback, setPlayback] = useState<number | null>(null);
  const curtainRef = useRef<HTMLDivElement | null>(null);

  // light follows the real sun now; ?time=HH[:MM] and ?date=YYYY-MM-DD (Berlin local) pin it, ?weather= fixes the weather, ?state= opens a view for review (menu, search, play, music)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const w = q.get("weather");
    setSceneState({
      date: q.get("date"),
      time: q.get("time"),
      weather: w && w in PRESETS ? (w as Condition) : null,
    });
    const timers: number[] = [];
    const state = q.get("state");
    const later = (fn: () => void) => timers.push(window.setTimeout(fn, 1300));
    if (state === "menu") later(() => setMenu({ tab: "main" }));
    if (state === "search")
      later(() => setMenu({ tab: "search", query: "agent" }));
    if (state === "play") later(() => setPlayback(1));
    if (state === "music") later(() => setMenu({ tab: "music" }));
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, []);

  // the clock runs while neither day nor time is pinned
  const pinned = scene.date !== null || scene.time !== null;
  useEffect(() => {
    setAt(berlinInstant(scene.date, scene.time, new Date()));
    if (pinned) return;
    const id = window.setInterval(() => setAt(new Date()), 60000);
    return () => clearInterval(id);
  }, [scene.date, scene.time, pinned]);

  /** Pins day, time or weather from the scene panel and keeps the address in step, so the view can be shared. */
  const setScene = useCallback((next: Partial<SceneSetting>) => {
    setSceneState((cur) => {
      const merged = { ...cur, ...next };
      const url = new URL(window.location.href);
      for (const k of ["date", "time", "weather"] as const) {
        const v = merged[k];
        if (v) url.searchParams.set(k, v);
        else url.searchParams.delete(k);
      }
      window.history.replaceState(window.history.state, "", url);
      return merged;
    });
  }, []);

  const fireCurtain = useCallback(() => {
    const c = curtainRef.current;
    if (!c) return;
    c.classList.remove(cls(s.fire));
    void c.offsetWidth;
    c.classList.add(cls(s.fire));
  }, []);

  /** Shutter: blackout, then go to another page of the site. */
  const shoot = useCallback(
    (path: string) => {
      fireCurtain();
      setShots((n) => n + 1);
      window.setTimeout(() => {
        router.push(`/${locale}${path}`);
      }, 130);
    },
    [fireCurtain, router, locale],
  );

  const openPlayback = useCallback(
    (i: number) => setPlayback(((i % COUNT) + COUNT) % COUNT),
    [],
  );
  const runAction = useCallback(
    (action: MenuAction) => {
      setMenu(null);
      switch (action.kind) {
        case "project":
          openPlayback(action.index);
          break;
        case "route":
          shoot(action.path);
          break;
        case "external":
          if (action.href.startsWith("mailto:"))
            window.location.href = action.href;
          else window.open(action.href, "_blank", "noopener,noreferrer");
          break;
        case "locale": {
          const other = locale === "en" ? "de" : "en";
          router.push(pathname.replace(`/${locale}`, `/${other}`));
          break;
        }
      }
    },
    [shoot, openPlayback, router, locale, pathname],
  );

  const openMenu = useCallback((req: MenuRequest) => setMenu(req), []);
  const closeMenu = useCallback(() => setMenu(null), []);
  const cycleMode = useCallback(
    () => setMode((m) => ((m + 1) % 3) as DisplayMode),
    [],
  );
  const closePlayback = useCallback(() => setPlayback(null), []);

  // keys: M menu, Ctrl/Cmd K search, D display, arrows step through an open file; the menu handles its own keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openMenu({ tab: "search" });
        return;
      }
      if (menu) return;
      if (playback !== null) {
        if (e.key === "Escape") closePlayback();
        if (e.key === "ArrowRight") openPlayback(playback + 1);
        if (e.key === "ArrowLeft") openPlayback(playback - 1);
        return;
      }
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea, select, [contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "m" || e.key === "M") openMenu({ tab: "main" });
      else if (e.key === "d" || e.key === "D") cycleMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, playback, openMenu, closePlayback, openPlayback, cycleMode]);

  return {
    at,
    weatherOverride: scene.weather ? PRESETS[scene.weather] : null,
    scene,
    setScene,
    sceneOpen,
    setSceneOpen,
    mode,
    cycleMode,
    shots,
    shoot,
    runAction,
    menu,
    openMenu,
    closeMenu,
    playback,
    openPlayback,
    closePlayback,
    curtainRef,
  };
}
