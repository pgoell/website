"use client";

import { useEffect, useRef } from "react";
import type { SceneWeather } from "@/lib/weather/weather";
import {
  createGelnhausenScene,
  type Scene,
  type View,
} from "./gelnhausen-engine";

interface Props {
  at: Date | null;
  weather: SceneWeather | null;
  className?: string;
  label: string;
  /** The host element; the page fades and scales it on power-on. */
  hostRef: React.RefObject<HTMLDivElement | null>;
  /** Filled with the mounted scene, so the page can pull focus. */
  sceneRef?: React.RefObject<Scene | null>;
  /** The f-number for the depth of field. */
  aperture: number;
}

/**
 * The Gelnhausen canvas illustration. Pauses its animation when off screen or when the tab is hidden.
 * On a touch screen one finger pans and two fingers zoom; the canvases move by CSS while the
 * fingers are down and are redrawn sharp at the new view when they lift.
 */
export function GelnhausenScene({
  at,
  weather,
  className,
  label,
  hostRef,
  sceneRef,
  aperture,
}: Props) {
  const scene = useRef<Scene | null>(null);
  const hasTime = at !== null;
  const atRef = useRef(at);
  atRef.current = at;
  const weatherRef = useRef(weather);
  weatherRef.current = weather;
  const apertureRef = useRef(aperture);
  apertureRef.current = aperture;

  // mount once the instant is known (it depends on the client clock)
  useEffect(() => {
    const el = hostRef.current;
    if (!el || !hasTime) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const s = createGelnhausenScene(el, {
      at: atRef.current ?? new Date(),
      weather: weatherRef.current,
      motion: !reduced,
      aperture: apertureRef.current,
    });
    scene.current = s;
    if (sceneRef) sceneRef.current = s;
    let visible = true;
    const sync = () => s.setRunning(visible && !document.hidden);
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      s.destroy();
      scene.current = null;
      if (sceneRef) sceneRef.current = null;
    };
  }, [hasTime, hostRef, sceneRef]);

  // touch pan and pinch zoom
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const pts = new Map<number, { x: number; y: number }>();
    let live: View | null = null;
    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const spread = () => {
      const [a, b] = [...pts.values()];
      if (!a) return null;
      if (!b) return { m: a, d: 0 };
      return {
        m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        d: Math.hypot(a.x - b.x, a.y - b.y),
      };
    };
    // preview: move the drawn canvases from the drawn view to the live one
    const preview = (s: Scene, v: View) => {
      const c = s.view();
      const k = v.z / c.z;
      const t = `translate(${v.x - k * c.x}px,${v.y - k * c.y}px) scale(${k})`;
      for (const n of el.querySelectorAll("canvas")) {
        n.style.transformOrigin = `${-n.offsetLeft}px ${-n.offsetTop}px`;
        n.style.transform = t;
      }
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || !scene.current) return;
      el.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, local(e));
      live ??= scene.current.view();
    };
    const move = (e: PointerEvent) => {
      const s = scene.current;
      if (!s || !live || !pts.has(e.pointerId)) return;
      const before = spread();
      pts.set(e.pointerId, local(e));
      const after = spread();
      if (!before || !after) return;
      // keep the drawing under the fingers' midpoint; the spread between two fingers sets the zoom
      const k =
        before.d && after.d
          ? s.clampView({ ...live, z: (live.z * after.d) / before.d }).z /
            live.z
          : 1;
      // a drag or pinch is not a tap to focus: keep the whole frame sharp while it moves
      s.unfocus();
      live = s.clampView({
        z: live.z * k,
        x: after.m.x - k * (before.m.x - live.x),
        y: after.m.y - k * (before.m.y - live.y),
      });
      preview(s, live);
    };
    const up = (e: PointerEvent) => {
      if (!pts.delete(e.pointerId) || pts.size || !live) return;
      const s = scene.current;
      for (const n of el.querySelectorAll("canvas")) n.style.transform = "";
      const v = live;
      live = null;
      const c = s?.view();
      if (s && c && (c.z !== v.z || c.x !== v.x || c.y !== v.y)) s.setView(v);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [hostRef]);

  useEffect(() => {
    if (at !== null) scene.current?.setTime(at);
  }, [at]);

  useEffect(() => {
    scene.current?.setWeather(weather);
  }, [weather]);

  useEffect(() => {
    scene.current?.setAperture(aperture);
  }, [aperture]);

  return (
    <div ref={hostRef} className={className} role="img" aria-label={label} />
  );
}
