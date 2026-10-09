"use client";

import { useEffect, useRef } from "react";
import { createGelnhausenScene, type Scene } from "./gelnhausen-engine";

interface Props {
  at: Date | null;
  className?: string;
  label: string;
  /** The host element; the page fades and scales it on power-on. */
  hostRef: React.RefObject<HTMLDivElement | null>;
}

/** The Gelnhausen canvas illustration. Pauses its animation when off screen or when the tab is hidden. */
export function GelnhausenScene({ at, className, label, hostRef }: Props) {
  const scene = useRef<Scene | null>(null);
  const hasTime = at !== null;
  const atRef = useRef(at);
  atRef.current = at;

  // mount once the instant is known (it depends on the client clock)
  useEffect(() => {
    const el = hostRef.current;
    if (!el || !hasTime) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const s = createGelnhausenScene(el, {
      at: atRef.current ?? new Date(),
      motion: !reduced,
    });
    scene.current = s;
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
    };
  }, [hasTime, hostRef]);

  useEffect(() => {
    if (at !== null) scene.current?.setTime(at);
  }, [at]);

  return (
    <div ref={hostRef} className={className} role="img" aria-label={label} />
  );
}
