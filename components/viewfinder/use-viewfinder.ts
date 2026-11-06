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

/** Page state for the viewfinder home: clock, shutter, display mode, menu, map selection and playback. */
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
  const [onlyMap, setOnlyMap] = useState(false);
  const [mode, setMode] = useState<DisplayMode>(0);
  const [shots, setShots] = useState(1284);
  const [menu, setMenu] = useState<MenuRequest | null>(null);
  const [lastTab, setLastTab] = useState<MenuTabDef["id"]>("work");
  const [playback, setPlayback] = useState<number | null>(null);
  const [pick, setPick] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const curtainRef = useRef<HTMLDivElement | null>(null);

  // light follows the real sun now; ?time=HH[:MM] and ?date=YYYY-MM-DD (Berlin local) pin it, ?weather= fixes the weather, ?state= opens a view for review
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
    if (state === "menu") later(() => setMenu({ tab: "work" }));
    if (state === "search")
      later(() => setMenu({ tab: "search", query: "agent" }));
    if (state === "play") later(() => setPlayback(1));
    if (state === "map") {
      setOnlyMap(true);
      later(() => setPick(1));
    }
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

  /** Shutter: blackout, then jump to a section (#id) or another page of the site. */
  const shoot = useCallback(
    (target: string) => {
      fireCurtain();
      setShots((n) => n + 1);
      window.setTimeout(() => {
        if (target.startsWith("#")) {
          const el = document.querySelector(target);
          if (el)
            window.scrollTo({
              top: el.getBoundingClientRect().top + window.scrollY - 8,
              behavior: "instant",
            });
        } else router.push(`/${locale}${target}`);
      }, 130);
    },
    [fireCurtain, router, locale],
  );

  const runAction = useCallback(
    (action: MenuAction) => {
      setMenu(null);
      switch (action.kind) {
        case "pin":
          shoot("#work");
          window.setTimeout(() => setPick(action.index), 160);
          break;
        case "section":
          shoot(`#${action.id}`);
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
    [shoot, router, locale, pathname],
  );

  const openMenu = useCallback((req: MenuRequest) => {
    if (req.tab !== "search") setLastTab(req.tab);
    setMenu(req);
  }, []);
  const closeMenu = useCallback(() => setMenu(null), []);
  const cycleMode = useCallback(
    () => setMode((m) => ((m + 1) % 3) as DisplayMode),
    [],
  );
  const openPlayback = useCallback(
    (i: number) => setPlayback(((i % COUNT) + COUNT) % COUNT),
    [],
  );
  const closePlayback = useCallback(() => setPlayback(null), []);

  // keys: M menu, Ctrl/Cmd K search, D display, 1 to 6 shoot, arrows pick files; the menu handles its own keys
  const fnRef = useRef<Array<() => void>>([]);
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
      if (e.key === "m" || e.key === "M") openMenu({ tab: lastTab });
      else if (e.key === "d" || e.key === "D") cycleMode();
      else if (/^[1-6]$/.test(e.key)) fnRef.current[Number(e.key) - 1]?.();
      else if (mapReady && (e.key === "ArrowRight" || e.key === "ArrowLeft"))
        setPick((p) => (p + (e.key === "ArrowRight" ? 1 : COUNT - 1)) % COUNT);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    menu,
    playback,
    lastTab,
    mapReady,
    openMenu,
    closePlayback,
    openPlayback,
    cycleMode,
  ]);

  return {
    at,
    weatherOverride: scene.weather ? PRESETS[scene.weather] : null,
    scene,
    setScene,
    sceneOpen,
    setSceneOpen,
    onlyMap,
    mode,
    cycleMode,
    shots,
    shoot,
    runAction,
    menu,
    openMenu,
    closeMenu,
    lastTab,
    playback,
    openPlayback,
    closePlayback,
    pick,
    setPick,
    mapReady,
    setMapReady,
    curtainRef,
    setLastTab,
    fnRef,
  };
}
