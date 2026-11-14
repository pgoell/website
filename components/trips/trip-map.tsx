"use client";

import type {
  GeoJSONSource,
  Map as MapLibreMap,
  StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Look } from "@/lib/trips/look";
import { arc } from "@/lib/trips/plan";
import type { LngLat, Trip, TripStop } from "@/lib/trips/types";
import night from "./map-style.json";
import paper from "./map-style-day.json";
import s from "./trips.module.css";

/** The colours drawn over the map, for the dark screen and for paper. */
const INKS = {
  night: {
    route: "#5cf07c",
    picked: "#f08a00",
    place: "#2ec4b6",
    ink: "#f3f4f1",
    ground: "#050606",
  },
  day: {
    route: "#177a3a",
    picked: "#c25a00",
    place: "#0f7f76",
    ink: "#151716",
    ground: "#f6f4ec",
  },
};
type Pad = { top: number; right: number; bottom: number; left: number };
const CREDIT =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

/** The map style, with tiles and fonts asked from this site, not from OpenFreeMap. */
function style(look: Look): StyleSpecification {
  const origin = window.location.origin;
  return {
    ...((look === "day" ? paper : night) as unknown as StyleSpecification),
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

/**
 * A read-only map of one trip: its line, its stops and its places. The map
 * fills its box and is the page there, so one finger and the wheel move it.
 * A new look needs a new map: give the component a key that holds the look.
 */
export function TripMap({
  trip,
  look,
  picked,
  focus,
  pad,
  mark,
  label,
  broken,
}: {
  trip: Trip;
  /** The ground lines of the day that is picked, drawn over the trip's. */
  picked: LngLat[][];
  look: Look;
  /** Points to bring into view. A new array moves the camera. */
  focus: LngLat[];
  /** Room to keep clear around the view, for what lies on the map. */
  pad: Pad;
  /** The stop to ring and to name. The other stops show their number only. */
  mark: TripStop | null;
  label: string;
  /** What to say when the map cannot start. */
  broken: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  // The map is built once and reads the first trip and view from here.
  const first = useRef({ trip, focus, pad, look });

  useEffect(() => {
    let gone = false;
    let m: MapLibreMap | undefined;
    import("maplibre-gl").then((gl) => {
      if (gone || !container.current) return;
      lib.current = gl;
      const { trip, focus, pad, look } = first.current;
      const { route, picked: hot, place, ink, ground: paperTone } = INKS[look];
      const bounds = new gl.LngLatBounds();
      for (const p of focus) bounds.extend(p);
      try {
        m = new gl.Map({
          container: container.current,
          style: style(look),
          bounds,
          fitBoundsOptions: { padding: pad, maxZoom: 12 },
          attributionControl: { compact: true },
        });
      } catch {
        // No WebGL. The plan beside the map still works.
        setFailed(true);
        return;
      }
      const made = m;
      map.current = made;
      made.addControl(new gl.NavigationControl({ showCompass: false }));

      made.on("load", () => {
        // On a narrow map the credit starts folded behind its button.
        if (window.innerWidth <= 760) {
          container.current
            ?.querySelector(".maplibregl-ctrl-attrib")
            ?.classList.remove("maplibregl-compact-show");
        }
        made.addImage("stop", square(24, paperTone, route), { pixelRatio: 2 });
        made.addImage("place", square(13, place, paperTone), { pixelRatio: 2 });
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
        made.addSource("mark", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
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
              "line-width": 7,
              "line-blur": 8,
              "line-opacity": 0.16,
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
            "line-color": ink,
            "line-width": 1.2,
            "line-dasharray": [3, 3],
            "line-opacity": 0.6,
          },
        });
        glow("ground-glow", "ground", route);
        line("ground", "ground", route);
        glow("picked-glow", "picked", hot);
        line("picked", "picked", hot);
        made.addLayer({
          id: "mark-glow",
          type: "circle",
          source: "mark",
          paint: {
            "circle-radius": 30,
            "circle-color": hot,
            "circle-opacity": 0.16,
            "circle-blur": 0.6,
          },
        });
        made.addLayer({
          id: "mark",
          type: "circle",
          source: "mark",
          paint: {
            "circle-radius": 19,
            "circle-color": "rgba(0,0,0,0)",
            "circle-stroke-color": hot,
            "circle-stroke-width": 2,
          },
        });
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
            "text-color": ink,
            "text-halo-color": paperTone,
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
          paint: { "text-color": route },
        });
        made.addLayer({
          id: "stop-names",
          type: "symbol",
          source: "stops",
          // Only the marked stop is named, so the map stays calm.
          filter: ["==", ["get", "label"], ""],
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
            "text-color": route,
            "text-halo-color": paperTone,
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
    if (!loaded || !m) return;
    m.getSource<GeoJSONSource>("mark")?.setData({
      type: "FeatureCollection",
      features: mark
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: [mark.lng, mark.lat] },
            },
          ]
        : [],
    });
    m.setFilter("stop-names", [
      "==",
      ["get", "label"],
      mark ? String(mark.position) : "",
    ]);
  }, [loaded, mark]);

  useEffect(() => {
    const m = map.current;
    const gl = lib.current;
    if (!loaded || !m || !gl || focus.length === 0) return;
    const bounds = new gl.LngLatBounds();
    for (const p of focus) bounds.extend(p);
    // One point is a stop in open country: stay far enough out to see where it lies.
    const cam = m.cameraForBounds(bounds, {
      padding: pad,
      maxZoom: focus.length === 1 ? 9.5 : 14,
    });
    if (!cam?.center || cam.zoom === undefined) return;
    const to = { center: cam.center, zoom: cam.zoom, pitch: 0 };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      m.jumpTo(to);
    } else {
      m.flyTo(to);
    }
  }, [loaded, focus, pad]);

  if (failed) return <p className={s.noMap}>{broken}</p>;
  return (
    <div ref={container} className={s.map} role="img" aria-label={label} />
  );
}
