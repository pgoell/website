"use client";

import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Look } from "@/lib/trips/look";
import type { LngLat } from "@/lib/trips/types";
import s from "./pick.module.css";
import { INKS, square, style } from "./trip-map";

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

const fc = (features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({
  type: "FeatureCollection",
  features,
});
const point = (
  p: LatLng,
  properties: Record<string, unknown>,
): GeoJSON.Feature => ({
  type: "Feature",
  properties,
  geometry: { type: "Point", coordinates: [p.lng, p.lat] },
});
const ring = (
  pts: LngLat[],
  properties: Record<string, unknown> = {},
): GeoJSON.Feature => ({
  type: "Feature",
  properties,
  geometry: { type: "Polygon", coordinates: [pts] },
});

/** The map pin, drawn here so the map needs no sprite. */
function pinImage(fill: string, hole: string) {
  const c = document.createElement("canvas");
  c.width = 44;
  c.height = 60;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  g.fillStyle = fill;
  g.beginPath();
  g.arc(22, 22, 20, Math.PI, 0);
  g.bezierCurveTo(42, 36, 30, 46, 22, 60);
  g.bezierCurveTo(14, 46, 2, 36, 2, 22);
  g.fill();
  g.fillStyle = hole;
  g.beginPath();
  g.arc(22, 22, 8, 0, 2 * Math.PI);
  g.fill();
  return g.getImageData(0, 0, c.width, c.height);
}

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
  onPick?: (p: LatLng) => void;
  onSelect?: (id: string) => void;
}) {
  const box = useRef<HTMLElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const first = useRef({ look, fit, pad });
  const live = useRef({ onPick, onSelect });
  live.current = { onPick, onSelect };

  useEffect(() => {
    let gone = false;
    let m: MapLibreMap | undefined;
    import("maplibre-gl").then((gl) => {
      if (gone || !box.current) return;
      const { look, fit, pad } = first.current;
      const ink = INKS[look];
      const bounds = new gl.LngLatBounds();
      for (const p of fit) bounds.extend([p.lng, p.lat]);
      try {
        m = new gl.Map({
          container: box.current,
          style: style(look),
          bounds,
          fitBoundsOptions: { padding: pad, maxZoom: 15 },
          attributionControl: { compact: true },
        });
      } catch {
        setFailed(true);
        return;
      }
      const made = m;
      map.current = made;
      made.addControl(new gl.NavigationControl({ showCompass: false }));
      made.on("load", () => {
        // On a narrow map the credit starts folded behind its button.
        if (window.innerWidth <= 760) {
          box.current
            ?.querySelector(".maplibregl-ctrl-attrib")
            ?.classList.remove("maplibregl-compact-show");
        }
        made.addImage("pin", pinImage(ink.picked, ink.ground), {
          pixelRatio: 2,
        });
        made.addImage("match", square(22, ink.ground, ink.route), {
          pixelRatio: 2,
        });
        made.addImage("match-must", square(22, ink.ground, ink.picked), {
          pixelRatio: 2,
        });
        made.addImage("match-on", square(22, ink.route, ink.route), {
          pixelRatio: 2,
        });
        made.addImage("yes", square(8, ink.route, ink.route), {
          pixelRatio: 2,
        });
        for (const id of [
          "circle",
          "rings",
          "dots",
          "current",
          "numbered",
          "pin",
        ]) {
          made.addSource(id, { type: "geojson", data: fc([]) });
        }
        made.addLayer({
          id: "circle-fill",
          type: "fill",
          source: "circle",
          paint: { "fill-color": ink.picked, "fill-opacity": 0.08 },
        });
        made.addLayer({
          id: "circle-line",
          type: "line",
          source: "circle",
          paint: {
            "line-color": ink.picked,
            "line-width": 1.5,
            "line-dasharray": [3, 3],
          },
        });
        made.addLayer({
          id: "rings-fill",
          type: "fill",
          source: "rings",
          paint: { "fill-color": ink.route, "fill-opacity": 0.07 },
        });
        made.addLayer({
          id: "rings-line",
          type: "line",
          source: "rings",
          paint: {
            "line-color": ink.route,
            "line-opacity": 0.5,
            "line-width": 1,
            "line-dasharray": [1, 3],
          },
        });
        made.addLayer({
          id: "dots-new",
          type: "circle",
          source: "dots",
          filter: ["==", ["get", "seen"], "new"],
          paint: {
            "circle-radius": 4.5,
            "circle-color": ink.ground,
            "circle-stroke-color": ink.ink,
            "circle-stroke-width": 1.5,
          },
        });
        made.addLayer({
          id: "dots-seen",
          type: "symbol",
          source: "dots",
          filter: ["==", ["get", "seen"], "yes"],
          layout: { "icon-image": "yes", "icon-allow-overlap": true },
        });
        made.addLayer({
          id: "dots-no",
          type: "circle",
          source: "dots",
          filter: ["==", ["get", "seen"], "no"],
          paint: {
            "circle-radius": 2.5,
            "circle-color": ink.ink,
            "circle-opacity": 0.35,
          },
        });
        made.addLayer({
          id: "current-ring",
          type: "circle",
          source: "current",
          paint: {
            "circle-radius": 14,
            "circle-color": "rgba(0,0,0,0)",
            "circle-stroke-color": ink.picked,
            "circle-stroke-width": 2,
          },
        });
        made.addLayer({
          id: "current-dot",
          type: "circle",
          source: "current",
          paint: { "circle-radius": 5, "circle-color": ink.picked },
        });
        made.addLayer({
          id: "current-name",
          type: "symbol",
          source: "current",
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans Bold"],
            "text-size": 13,
            "text-transform": "uppercase",
            "text-letter-spacing": 0.08,
            "text-anchor": "left",
            "text-offset": [1.6, 0],
          },
          paint: {
            "text-color": ink.picked,
            "text-halo-color": ink.ground,
            "text-halo-width": 1.5,
          },
        });
        made.addLayer({
          id: "ring-names",
          type: "symbol",
          source: "rings",
          layout: {
            "text-field": ["get", "label"],
            "text-font": ["Noto Sans Bold"],
            "text-size": 11,
            "text-transform": "uppercase",
            "text-letter-spacing": 0.1,
            "symbol-placement": "point",
          },
          paint: {
            "text-color": ink.route,
            "text-halo-color": ink.ground,
            "text-halo-width": 1.5,
          },
        });
        made.addLayer({
          id: "numbered",
          type: "symbol",
          source: "numbered",
          layout: {
            "icon-image": [
              "case",
              ["get", "on"],
              "match-on",
              ["get", "must"],
              "match-must",
              "match",
            ],
            "icon-allow-overlap": true,
            "text-field": ["to-string", ["get", "n"]],
            "text-font": ["Noto Sans Bold"],
            "text-size": 11,
            "text-allow-overlap": true,
          },
          paint: {
            "text-color": [
              "case",
              ["get", "on"],
              ink.ground,
              ["get", "must"],
              ink.picked,
              ink.route,
            ],
          },
        });
        made.addLayer({
          id: "numbered-name",
          type: "symbol",
          source: "numbered",
          filter: ["get", "on"],
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans Bold"],
            "text-size": 13,
            "text-transform": "uppercase",
            "text-letter-spacing": 0.08,
            "text-anchor": "left",
            "text-offset": [1.4, 0],
          },
          paint: {
            "text-color": ink.route,
            "text-halo-color": ink.ground,
            "text-halo-width": 1.5,
          },
        });
        made.addLayer({
          id: "pin",
          type: "symbol",
          source: "pin",
          layout: {
            "icon-image": "pin",
            "icon-anchor": "bottom",
            "icon-allow-overlap": true,
          },
        });
        made.on("click", (e) => {
          const hit = made.queryRenderedFeatures(e.point, {
            layers: ["numbered"],
          })[0];
          if (hit) return live.current.onSelect?.(String(hit.properties.id));
          live.current.onPick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        });
        made.on("mouseenter", "numbered", () => {
          made.getCanvas().style.cursor = "pointer";
        });
        made.on("mouseleave", "numbered", () => {
          made.getCanvas().style.cursor = "";
        });
        setLoaded(true);
      });
    });
    return () => {
      gone = true;
      m?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    const set = (id: string, data: GeoJSON.FeatureCollection) =>
      (m.getSource(id) as GeoJSONSource | undefined)?.setData(data);
    set("circle", fc(showCircle ? [ring(circle(pin, radius))] : []));
    set("pin", fc(showCircle ? [point(pin, {})] : []));
    set("dots", fc(dots.map((d) => point(d, { id: d.id, seen: d.seen }))));
    set("current", fc(current ? [point(current, { name: current.name })] : []));
    set(
      "numbered",
      fc(
        numbered.map((p) =>
          point(p, {
            id: p.id,
            n: p.n,
            must: p.must,
            on: p.id === selected,
            name: p.name,
          }),
        ),
      ),
    );
    set(
      "rings",
      fc(
        rings.map((r) =>
          ring(circle({ lng: r.center[0], lat: r.center[1] }, r.reach + 180), {
            label: r.label,
          }),
        ),
      ),
    );
    m.getCanvas().style.cursor = onPick ? "crosshair" : "";
  }, [
    loaded,
    pin,
    radius,
    showCircle,
    dots,
    current,
    numbered,
    rings,
    selected,
    onPick,
  ]);

  // A new set of points to show: the step changed, or the circle did.
  const last = useRef({ fit, pad });
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded || fit.length === 0) return;
    if (fit === last.current.fit && pad === last.current.pad) return;
    last.current = { fit, pad };
    import("maplibre-gl").then((gl) => {
      const b = new gl.LngLatBounds();
      for (const p of fit) b.extend([p.lng, p.lat]);
      m.fitBounds(b, { padding: pad, maxZoom: 15, duration: 600 });
    });
  }, [loaded, fit, pad]);

  // The map keeps its size to its box, which changes between the steps on a phone.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const o = new ResizeObserver(() => map.current?.resize());
    o.observe(el);
    return () => o.disconnect();
  }, []);

  if (failed) return <p className={s.noMap}>{broken}</p>;
  return <section ref={box} className={s.map} aria-label={label} />;
}
