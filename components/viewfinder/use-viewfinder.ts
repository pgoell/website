"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MenuAction, MenuTabDef } from "@/lib/viewfinder/menu";
import { PROJECTS } from "@/lib/viewfinder/projects";
import { berlinInstant } from "@/lib/viewfinder/time";
import { cls } from "./cx";
import s from "./viewfinder.module.css";

export type DisplayMode = 0 | 1 | 2;

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
  const [onlyMap, setOnlyMap] = useState(false);
  const [mode, setMode] = useState<DisplayMode>(0);
  const [shots, setShots] = useState(1284);
  const [menu, setMenu] = useState<MenuRequest | null>(null);
  const [lastTab, setLastTab] = useState<MenuTabDef["id"]>("work");
  const [playback, setPlayback] = useState<number | null>(null);
  const [pick, setPick] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const curtainRef = useRef<HTMLDivElement | null>(null);

  // light follows the real sun now; ?time=HH[:MM] and ?date=YYYY-MM-DD (Berlin local) pin it, ?state= opens a view for review
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const time = q.get("time");
    const date = q.get("date");
    setAt(berlinInstant(date, time, new Date()));
    const timers: number[] = [];
    if (!time && !date)
      timers.push(window.setInterval(() => setAt(new Date()), 60000));
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
      for (const t of timers) {
        clearInterval(t);
        clearTimeout(t);
      }
    };
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
