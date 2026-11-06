"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ambienceMix } from "@/lib/viewfinder/ambience";
import { sunAt } from "@/lib/viewfinder/sun";
import type { SceneWeather } from "@/lib/weather/weather";
import { type Ambience, createAmbience } from "./ambience-engine";

/**
 * Sound that follows the weather in the picture. Off on every visit: browsers only let audio start from a
 * click, so the audio graph is built on the first press of the toggle and paused while the tab is hidden.
 */
export function useAmbience(weather: SceneWeather | null, at: Date | null) {
  const [on, setOn] = useState(false);
  const onRef = useRef(false);
  const engine = useRef<Ambience | null>(null);
  // the sun's height only matters for birds, so a coarse step keeps the mix from changing every minute
  const sunAlt = at ? Math.round(sunAt(at).alt) : 30;
  const mix = useMemo(() => ambienceMix(weather, sunAlt), [weather, sunAlt]);
  const mixRef = useRef(mix);
  mixRef.current = mix;

  useEffect(() => {
    engine.current?.setMix(mix);
  }, [mix]);

  const toggle = useCallback(() => {
    if (typeof window.AudioContext !== "function") return;
    const next = !onRef.current;
    onRef.current = next;
    if (next && !engine.current) {
      engine.current = createAmbience();
      engine.current.setMix(mixRef.current);
    }
    void engine.current?.setOn(next);
    setOn(next);
  }, []);

  useEffect(() => {
    if (!on) return;
    const sync = () => void engine.current?.setOn(!document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [on]);

  useEffect(
    () => () => {
      engine.current?.destroy();
      engine.current = null;
    },
    [],
  );

  return { on, toggle };
}
