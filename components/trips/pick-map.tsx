"use client";

import { useEffect, useRef, useState } from "react";
import type { Look } from "@/lib/trips/look";
import type { LngLat } from "@/lib/trips/types";
import {
  cameraFor,
  type HtmlLayer,
  htmlLayer,
  INKS,
  loadMaps,
  mapOptions,
  moveTo,
  label as nameLabel,
  type Pin,
  path,
  polyline,
  square,
} from "./gmap";
import s from "./pick.module.css";

type LatLng = { lat: number; lng: number };
export type Dot = LatLng & { id: string; seen: "new" | "yes" | "no" };
export type Numbered = LatLng & {
  id: string;
  n: number;
  must: boolean;
  name: string;
};
export type Ring = { center: LngLat; reach: number; label: string };

/** A circle of `m` metres around a point, as a ring of points. */
function circle(c: LatLng, m: number): LngLat[] {
  const dLat = m / 111_195;
  const dLng = dLat / Math.cos((c.lat * Math.PI) / 180);
  return Array.from({ length: 65 }, (_, i) => {
    const a = (i / 64) * 2 * Math.PI;
    return [c.lng + dLng * Math.sin(a), c.lat + dLat * Math.cos(a)];
  });
}

/** The map pin, drawn here so it keeps the look of the screen. */
function pinEl(fill: string, hole: string) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 44 60");
  svg.setAttribute("width", "22");
  svg.setAttribute("height", "30");
  const body = document.createElementNS(ns, "path");
  body.setAttribute(
    "d",
    "M2 22 A20 20 0 0 1 42 22 C42 36 30 46 22 60 C14 46 2 36 2 22 Z",
  );
  body.setAttribute("fill", fill);
  const dot = document.createElementNS(ns, "circle");
  dot.setAttribute("cx", "22");
  dot.setAttribute("cy", "22");
  dot.setAttribute("r", "8");
  dot.setAttribute("fill", hole);
  svg.append(body, dot);
  const box = document.createElement("div");
  box.append(svg);
  box.style.lineHeight = "0";
  return box;
}

function dot(size: number, fill: string, stroke?: string, opacity = 1) {
  const d = document.createElement("div");
  Object.assign(d.style, {
    width: `${size}px`,
    height: `${size}px`,
    boxSizing: "border-box",
    borderRadius: "50%",
    background: fill,
    border: stroke ? `1.5px solid ${stroke}` : "0",
    opacity: String(opacity),
  });
  return d;
}

const toLngLat = (p: LatLng): LngLat => [p.lng, p.lat];

/**
 * The swipe page's map: the pin and its circle, the places found, the card on
 * top, or the matches by area. A new look needs a new map: key it on the look.
 */
export function PickMap({
  look,
  pin,
  radius,
  showCircle,
  dots,
  current,
  numbered,
  rings,
  selected,
  fit,
  pad,
  label,
  broken,
  mapsKey,
  onPick,
  onSelect,
}: {
  look: Look;
  pin: LatLng;
  radius: number;
  showCircle: boolean;
  dots: Dot[];
  current: (LatLng & { name: string }) | null;
  numbered: Numbered[];
  rings: Ring[];
  selected: string | null;
  /** Points to bring into view; a new array moves the camera. */
  fit: LatLng[];
  pad: { top: number; right: number; bottom: number; left: number };
  label: string;
  broken: string;
  mapsKey: string | undefined;
  onPick?: (p: LatLng) => void;
  onSelect?: (id: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const layer = useRef<HtmlLayer | null>(null);
  const shapes = useRef<(google.maps.Polygon | google.maps.Polyline)[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const first = useRef({ look, fit, pad });
  const live = useRef({ onPick, onSelect });
  live.current = { onPick, onSelect };
  const ink = INKS[look];

  useEffect(() => {
    let gone = false;
    loadMaps(mapsKey).then(
      () => {
        const el = box.current;
        if (gone || !el) return;
        const { look, fit, pad } = first.current;
        const cam = cameraFor(
          fit.map(toLngLat),
          { width: el.clientWidth, height: el.clientHeight },
          pad,
          16,
        );
        const m = new google.maps.Map(el, {
          ...mapOptions(look),
          center: cam?.center ?? { lat: 35.68, lng: 139.76 },
          zoom: cam?.zoom ?? 12,
        });
        map.current = m;
        layer.current = htmlLayer(m);
        m.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng)
            live.current.onPick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
        setLoaded(true);
      },
      () => setFailed(true),
    );
    return () => {
      gone = true;
      layer.current?.remove();
      for (const x of shapes.current) x.setMap(null);
      map.current = null;
    };
  }, [mapsKey]);

  // The circle around the pin and the rings around the areas.
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    for (const x of shapes.current) x.setMap(null);
    const made: (google.maps.Polygon | google.maps.Polyline)[] = [];
    const area = (
      pts: LngLat[],
      color: string,
      fill: number,
      line: { opacity: number; width: number; dash: [number, number] },
    ) => {
      made.push(
        new google.maps.Polygon({
          map: m,
          paths: path(pts),
          fillColor: color,
          fillOpacity: fill,
          strokeOpacity: 0,
          clickable: false,
        }),
      );
      const edge = polyline(m, { color, ...line });
      edge.setPath(path(pts));
      made.push(edge);
    };
    if (showCircle)
      area(circle(pin, radius), ink.picked, 0.08, {
        opacity: 1,
        width: 1.5,
        dash: [2, 4],
      });
    for (const r of rings)
      area(
        circle({ lng: r.center[0], lat: r.center[1] }, r.reach + 180),
        ink.route,
        0.07,
        { opacity: 0.5, width: 1, dash: [1, 4] },
      );
    shapes.current = made;
    m.setOptions({ draggableCursor: onPick ? "crosshair" : null });
  }, [loaded, pin, radius, showCircle, rings, ink, onPick]);

  // The pin, the places found, the card on top and the matches.
  useEffect(() => {
    const l = layer.current;
    if (!l || !loaded) return;
    const pins: Pin[] = [];
    for (const d of dots) {
      const el =
        d.seen === "new"
          ? dot(9, ink.ground, ink.ink)
          : d.seen === "yes"
            ? square(8, ink.route, ink.route)
            : dot(5, ink.ink, undefined, 0.35);
      pins.push({ at: toLngLat(d), el, z: 1 });
    }
    for (const r of rings) {
      pins.push({
        at: r.center,
        el: nameLabel(r.label, ink.route, ink.ground),
        z: 2,
      });
    }
    if (current) {
      const ring = dot(28, "transparent", ink.picked);
      ring.style.borderWidth = "2px";
      pins.push({ at: toLngLat(current), el: ring, z: 3 });
      pins.push({ at: toLngLat(current), el: dot(10, ink.picked), z: 3 });
      pins.push({
        at: toLngLat(current),
        el: nameLabel(current.name, ink.picked, ink.ground, 13),
        anchor: "left",
        offset: [20, 0],
        z: 3,
      });
    }
    for (const p of numbered) {
      const on = p.id === selected;
      const el = on
        ? square(22, ink.route, ink.route, String(p.n), ink.ground)
        : p.must
          ? square(22, ink.ground, ink.picked, String(p.n), ink.picked)
          : square(22, ink.ground, ink.route, String(p.n), ink.route);
      const hit = document.createElement("div");
      Object.assign(hit.style, { padding: "6px", cursor: "pointer" });
      hit.append(el);
      hit.addEventListener("click", (e) => {
        e.stopPropagation();
        live.current.onSelect?.(p.id);
      });
      pins.push({ at: toLngLat(p), el: hit, hit: true, z: on ? 5 : 4 });
      if (on)
        pins.push({
          at: toLngLat(p),
          el: nameLabel(p.name, ink.route, ink.ground, 13),
          anchor: "left",
          offset: [18, 0],
          z: 5,
        });
    }
    if (showCircle)
      pins.push({
        at: toLngLat(pin),
        el: pinEl(ink.picked, ink.ground),
        anchor: "bottom",
        z: 6,
      });
    l.set(pins);
  }, [loaded, pin, showCircle, dots, current, numbered, rings, selected, ink]);

  // A new set of points to show: the step changed, or the circle did.
  const last = useRef({ fit, pad });
  useEffect(() => {
    const m = map.current;
    const el = box.current;
    if (!m || !el || !loaded || fit.length === 0) return;
    if (fit === last.current.fit && pad === last.current.pad) return;
    last.current = { fit, pad };
    const cam = cameraFor(
      fit.map(toLngLat),
      { width: el.clientWidth, height: el.clientHeight },
      pad,
      16,
    );
    if (cam) moveTo(m, cam);
  }, [loaded, fit, pad]);

  if (failed) return <p className={s.noMap}>{broken}</p>;
  return (
    <section className={s.map} aria-label={label}>
      <div ref={box} className={s.map} />
    </section>
  );
}
