"use client";

import type {
  GeoJSONSource,
  Map as MapLibreMap,
  StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { arc, coords } from "@/lib/trips/plan";
import type { LngLat, Trip } from "@/lib/trips/types";
import night from "./map-style.json";
import s from "./trips.module.css";

const ROUTE = "#5cf07c";
const PICKED = "#f08a00";
const PLACE = "#2ec4b6";
const INK = "#f3f4f1";
const DARK = "#050606";
const CREDIT =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

/** The night style, with tiles and fonts asked from this site, not from OpenFreeMap. */
function style(): StyleSpecification {
  const origin = window.location.origin;
  return {
    ...(night as unknown as StyleSpecification),
    glyphs: `${origin}/api/map/fonts/{fontstack}/{range}.pbf`,
    sources: {
      openmaptiles: {
        type: "vector",
        tiles: [`${origin}/api/map/tiles/{z}/{x}/{y}`],
        maxzoom: 14,
        attribution: CREDIT,
      },
    },
  };
}

/** A square marker, drawn here so the map needs no sprite. */
function square(size: number, fill: string, stroke: string) {
  const c = document.createElement("canvas");
  c.width = c.height = size * 2;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  g.fillStyle = stroke;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = fill;
  g.fillRect(4, 4, c.width - 8, c.height - 8);
  return g.getImageData(0, 0, c.width, c.height);
}

const lines = (paths: LngLat[][]): GeoJSON.Feature => ({
  type: "Feature",
  properties: {},
  geometry: { type: "MultiLineString", coordinates: paths },
});

/** A read-only map of one trip: its line, its stops and its places. */
export function TripMap({
  trip,
  picked,
  focus,
  label,
  broken,
}: {
  trip: Trip;
  /** The ground lines of the day that is picked, drawn over the trip's. */
  picked: LngLat[][];
  /** Points to bring into view. A new array moves the camera. */
  focus: LngLat[];
  label: string;
  /** What to say when the map cannot start. */
  broken: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [at, setAt] = useState<{ lat: number; lng: number; zoom: number }>();
  // The map is built once and reads the first trip and view from here.
  const first = useRef({ trip, focus });

  useEffect(() => {
    let gone = false;
    let m: MapLibreMap | undefined;
    import("maplibre-gl").then((gl) => {
      if (gone || !container.current) return;
      lib.current = gl;
      const { trip, focus } = first.current;
      const bounds = new gl.LngLatBounds();
      for (const p of focus) bounds.extend(p);
      try {
        m = new gl.Map({
          container: container.current,
          style: style(),
          bounds,
          fitBoundsOptions: { padding: 48, maxZoom: 12 },
          attributionControl: { compact: true },
          // The page scrolls past the map: one finger scrolls, two move the map.
          cooperativeGestures: true,
        });
      } catch {
        // No WebGL. The plan beside the map still works.
        setFailed(true);
        return;
      }
      const made = m;
      map.current = made;
      made.addControl(new gl.NavigationControl({ visualizePitch: true }));
      const read = () => {
        const c = made.getCenter();
        setAt({ lat: c.lat, lng: c.lng, zoom: made.getZoom() });
      };
      made.on("move", read);
      read();

      made.on("load", () => {
        made.addImage("stop", square(24, DARK, ROUTE), { pixelRatio: 2 });
        made.addImage("place", square(13, PLACE, DARK), { pixelRatio: 2 });
        const flights = trip.legs.filter((l) => l.mode === "flight");
        const ground = trip.legs.filter((l) => l.mode === "ground");
        made.addSource("flights", {
          type: "geojson",
          data: lines(
            flights.map((l) =>
              arc(l.path[0] as LngLat, l.path.at(-1) as LngLat),
            ),
          ),
        });
        made.addSource("ground", {
          type: "geojson",
          data: lines(ground.map((l) => l.path)),
        });
        made.addSource("picked", { type: "geojson", data: lines([]) });
        made.addSource("stops", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: trip.stops.map((p) => ({
              type: "Feature",
              properties: { label: String(p.position), name: p.name },
              geometry: { type: "Point", coordinates: [p.lng, p.lat] },
            })),
          },
        });
        made.addSource("places", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: trip.places.flatMap((p): GeoJSON.Feature[] =>
              p.lat === null || p.lng === null
                ? []
                : [
                    {
                      type: "Feature",
                      properties: { name: p.name },
                      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
                    },
                  ],
            ),
          },
        });

        const glow = (id: string, source: string, color: string) =>
          made.addLayer({
            id,
            type: "line",
            source,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": color,
              "line-width": 10,
              "line-blur": 8,
              "line-opacity": 0.4,
            },
          });
        const line = (id: string, source: string, color: string) =>
          made.addLayer({
            id,
            type: "line",
            source,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": color, "line-width": 2.5 },
          });
        made.addLayer({
          id: "flights",
          type: "line",
          source: "flights",
          paint: {
            "line-color": INK,
            "line-width": 1.2,
            "line-dasharray": [3, 3],
            "line-opacity": 0.6,
          },
        });
        glow("ground-glow", "ground", ROUTE);
        line("ground", "ground", ROUTE);
        glow("picked-glow", "picked", PICKED);
        line("picked", "picked", PICKED);
        made.addLayer({
          id: "places",
          type: "symbol",
          source: "places",
          layout: { "icon-image": "place", "icon-allow-overlap": true },
        });
        made.addLayer({
          id: "place-names",
          type: "symbol",
          source: "places",
          minzoom: 10,
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans Regular"],
            "text-size": 11,
            "text-transform": "uppercase",
            "text-letter-spacing": 0.08,
            "text-offset": [0, 1.2],
            "text-anchor": "top",
          },
          paint: {
            "text-color": INK,
            "text-halo-color": DARK,
            "text-halo-width": 1.5,
          },
        });
        made.addLayer({
          id: "stops",
          type: "symbol",
          source: "stops",
          layout: {
            "icon-image": "stop",
            "icon-allow-overlap": true,
            "text-field": ["get", "label"],
            "text-font": ["Noto Sans Bold"],
            "text-size": 12,
            "text-allow-overlap": true,
          },
          paint: { "text-color": ROUTE },
        });
        made.addLayer({
          id: "stop-names",
          type: "symbol",
          source: "stops",
          minzoom: 4,
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans Bold"],
            "text-size": 12,
            "text-transform": "uppercase",
            "text-letter-spacing": 0.14,
            "text-variable-anchor": ["left", "right", "top", "bottom"],
            "text-radial-offset": 1.5,
            "text-optional": true,
          },
          paint: {
            "text-color": ROUTE,
            "text-halo-color": DARK,
            "text-halo-width": 2,
          },
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
    if (!loaded) return;
    map.current?.getSource<GeoJSONSource>("picked")?.setData(lines(picked));
  }, [loaded, picked]);

  useEffect(() => {
    const m = map.current;
    const gl = lib.current;
    if (!loaded || !m || !gl || focus.length === 0) return;
    const bounds = new gl.LngLatBounds();
    for (const p of focus) bounds.extend(p);
    const one = focus.length === 1;
    const zoom = one
      ? 13
      : m.cameraForBounds(bounds, { padding: 56, maxZoom: 14 })?.zoom;
    if (zoom === undefined) return;
    // Close views arrive tilted, so the buildings stand up. Overviews stay flat.
    m.flyTo({ center: bounds.getCenter(), zoom, pitch: zoom >= 13.5 ? 50 : 0 });
  }, [loaded, focus]);

  if (failed) return <p className={s.noMap}>{broken}</p>;
  return (
    <>
      <div ref={container} className={s.map} role="img" aria-label={label} />
      {at && (
        <p className={s.readout} aria-hidden="true">
          <span>{coords(at.lat, at.lng)}</span>
          <small>Z {at.zoom.toFixed(1)}</small>
        </p>
      )}
    </>
  );
}
