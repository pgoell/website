"use client";

import type {
  FilterSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapMouseEvent,
  MapTouchEvent,
  Point,
  StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Look } from "@/lib/trips/look";
import { arc } from "@/lib/trips/plan";
import type { Stretch } from "@/lib/trips/route";
import type {
  LngLat,
  PlaceStatus,
  Trip,
  TripPlace,
  TripStop,
} from "@/lib/trips/types";
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
    warn: "#ff5a4d",
  },
  day: {
    route: "#177a3a",
    picked: "#c25a00",
    place: "#0f7f76",
    ink: "#151716",
    ground: "#f6f4ec",
    warn: "#c2281c",
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

/** A place as the map of someone signed in knows it. */
type MapPlace = TripPlace & { id?: number; status?: PlaceStatus };

/**
 * The places with a pin. Numbered, each carries its place in the list,
 * counting the pinless too. A visitor's places carry their name only.
 */
const placePoints = (
  places: MapPlace[],
  numbered: boolean,
): GeoJSON.FeatureCollection => ({
  type: "FeatureCollection",
  features: places.flatMap((p, i): GeoJSON.Feature[] =>
    p.lat === null || p.lng === null
      ? []
      : [
          {
            type: "Feature",
            properties: {
              name: p.name,
              ...(p.id !== undefined && { id: p.id, status: p.status }),
              ...(numbered && { n: String(i + 1) }),
            },
            geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          },
        ],
  ),
});

/** A leg's line while it is bent: what the map draws and what it reports. */
export type RouteOnMap = {
  stretches: Stretch[];
  points: LngLat[];
  selected: number | null;
  /** The line before the changes. */
  before: LngLat[];
  /** The next drag draws a line by hand. */
  byHand: boolean;
  /** A new point on the stretch into point `i`, held from now on. */
  onInsert: (i: number, at: LngLat) => void;
  onMove: (i: number, at: LngLat) => void;
  onDrop: () => void;
  onSelect: (i: number | null) => void;
  onStroke: (line: LngLat[]) => void;
};

/** What only the map of someone signed in does: taps, pins and bending a line. */
export type MapEditing = {
  /** The places are numbered in their order: the picked day's route. */
  numbered: boolean;
  /** The next tap on the map sets a pin. */
  picking: boolean;
  /** A ground leg's line while it is bent, or null. */
  edit: RouteOnMap | null;
  /** What to show at the picked point of that line. */
  menu: ReactNode;
  onPick: (lng: number, lat: number) => void;
  onSelectPlace: (id: number) => void;
  onSelectStop: (position: number) => void;
  /** A tap that hit no marker. */
  onMiss: () => void;
};

/** How far around a tap or a press a point or the line still counts as hit. */
const REACH = { mouse: 9, touch: 20 };

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
  closeUp = false,
  editing,
}: {
  trip: Trip & { places: MapPlace[] };
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
  /** One point in `focus` is a place: come close, not just near. */
  closeUp?: boolean;
  /** Only for someone signed in. Without it the map is read-only. */
  editing?: MapEditing;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  // Where the picked point of a bent line lies on the screen, for its menu.
  const [menuAt, setMenuAt] = useState<{
    x: number;
    y: number;
    width: number;
  } | null>(null);
  // The map is built once and reads the first trip and view from here.
  const first = useRef({ trip, focus, pad, look, editable: !!editing });
  // Its handlers read the latest editing props from here.
  const live = useRef(editing);
  live.current = editing;

  useEffect(() => {
    let gone = false;
    let m: MapLibreMap | undefined;
    let stopEditing: (() => void) | undefined;
    import("maplibre-gl").then((gl) => {
      if (gone || !container.current) return;
      lib.current = gl;
      const { trip, focus, pad, look, editable } = first.current;
      const {
        route,
        picked: hot,
        place,
        ink,
        ground: paperTone,
        warn,
      } = INKS[look];
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
      if (editable) {
        made.addControl(
          new gl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
          }),
        );
      }

      made.on("load", () => {
        // On a narrow map the credit starts folded behind its button.
        if (window.innerWidth <= 760) {
          container.current
            ?.querySelector(".maplibregl-ctrl-attrib")
            ?.classList.remove("maplibregl-compact-show");
        }
        made.addImage("stop", square(24, paperTone, route), { pixelRatio: 2 });
        made.addImage("place", square(13, place, paperTone), { pixelRatio: 2 });
        if (editable) {
          for (const [name, size, fill, stroke] of [
            ["place-n", 21, place, paperTone],
            ["idea", 13, paperTone, hot],
            ["idea-n", 21, paperTone, hot],
            ["end", 22, hot, paperTone],
          ] as const) {
            made.addImage(name, square(size, fill, stroke), { pixelRatio: 2 });
          }
        }
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
          data: placePoints(trip.places, false),
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
          layout: editable
            ? {
                "icon-image": [
                  "concat",
                  ["match", ["get", "status"], "idea", "idea", "place"],
                  ["case", ["has", "n"], "-n", ""],
                ],
                "icon-allow-overlap": true,
                "text-field": ["coalesce", ["get", "n"], ""],
                "text-font": ["Noto Sans Bold"],
                "text-size": 11,
                "text-allow-overlap": true,
              }
            : { "icon-image": "place", "icon-allow-overlap": true },
          ...(editable && {
            paint: {
              "text-color": [
                "match",
                ["get", "status"],
                "idea",
                hot,
                paperTone,
              ],
            },
          }),
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
        if (editable) addEditLayers(made, { hot, ink, paperTone, warn });
        setLoaded(true);
      });
      if (editable) {
        stopEditing = listen(made, () => live.current);
      }
    });
    return () => {
      gone = true;
      stopEditing?.();
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
    // One point is a stop in open country: stay far enough out to see where
    // it lies. A place shown on its own is looked at close up.
    const cam = m.cameraForBounds(bounds, {
      padding: pad,
      maxZoom: focus.length === 1 && !closeUp ? 9.5 : closeUp ? 15 : 14,
    });
    if (!cam?.center || cam.zoom === undefined) return;
    const to = { center: cam.center, zoom: cam.zoom, pitch: 0 };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      m.jumpTo(to);
    } else {
      m.flyTo(to);
    }
  }, [loaded, focus, pad, closeUp]);

  // ---------- only for someone signed in ----------

  // The places change as they are added, filtered and pinned.
  const numbered = editing?.numbered ?? false;
  const editable = editing !== undefined;
  useEffect(() => {
    if (!loaded || !editable) return;
    map.current
      ?.getSource<GeoJSONSource>("places")
      ?.setData(placePoints(trip.places, numbered));
  }, [loaded, editable, trip.places, numbered]);

  // A leg drawn anew changes its line.
  useEffect(() => {
    if (!loaded || !editable) return;
    map.current
      ?.getSource<GeoJSONSource>("ground")
      ?.setData(
        lines(trip.legs.filter((l) => l.mode === "ground").map((l) => l.path)),
      );
  }, [loaded, editable, trip.legs]);

  // The line being bent. The day's own line and the other legs step back.
  const edit = editing?.edit ?? null;
  const bending = edit !== null;
  useEffect(() => {
    const m = map.current;
    if (!loaded || !m || !editable) return;
    for (const id of ["picked", "picked-glow"]) {
      m.setLayoutProperty(id, "visibility", bending ? "none" : "visible");
    }
    m.setPaintProperty("ground", "line-opacity", bending ? 0.3 : 1);
    m.setPaintProperty("ground-glow", "line-opacity", bending ? 0.05 : 0.16);
    if (!bending) m.getCanvas().style.cursor = "";
  }, [loaded, editable, bending]);

  const picking = editing?.picking ?? false;
  useEffect(() => {
    const m = map.current;
    if (!loaded || !m || !editable) return;
    m.getCanvas().style.cursor = picking ? "crosshair" : "";
  }, [loaded, editable, picking]);

  const stretches = edit?.stretches;
  const points = edit?.points;
  const selected = edit?.selected ?? null;
  const before = edit?.before;
  useEffect(() => {
    const m = map.current;
    if (!loaded || !m || !editable) return;
    m.getSource<GeoJSONSource>("edit")?.setData({
      type: "FeatureCollection",
      features: (stretches ?? []).map((x, i) => ({
        type: "Feature",
        properties: { kind: x.kind, index: i + 1 },
        geometry: { type: "LineString", coordinates: x.line },
      })),
    });
    m.getSource<GeoJSONSource>("edit-points")?.setData({
      type: "FeatureCollection",
      features: (points ?? []).map((p, i, all) => ({
        type: "Feature",
        properties: {
          index: i,
          selected: i === selected,
          end: i === 0 ? "A" : i === all.length - 1 ? "B" : "",
        },
        geometry: { type: "Point", coordinates: p },
      })),
    });
  }, [loaded, editable, stretches, points, selected]);
  useEffect(() => {
    if (!loaded || !editable) return;
    map.current
      ?.getSource<GeoJSONSource>("edit-before")
      ?.setData(lines(before ? [before] : []));
  }, [loaded, editable, before]);

  // The menu of the picked point follows the map.
  const menuPoint = selected === null ? undefined : points?.[selected];
  useEffect(() => {
    const m = map.current;
    if (!m || !menuPoint) {
      setMenuAt(null);
      return;
    }
    const place = () => {
      const { x, y } = m.project(menuPoint);
      setMenuAt({ x, y, width: m.getContainer().clientWidth });
    };
    place();
    m.on("move", place);
    return () => {
      m.off("move", place);
    };
  }, [menuPoint]);

  if (failed) return <p className={s.noMap}>{broken}</p>;
  if (!editing) {
    return (
      <div ref={container} className={s.map} role="img" aria-label={label} />
    );
  }
  const left = menuAt
    ? Math.min(Math.max(menuAt.x, 136), menuAt.width - 136)
    : 0;
  return (
    <>
      <div ref={container} className={s.map} role="img" aria-label={label} />
      {editing.menu && menuAt && (
        <div
          className={s.routeMenu}
          data-below={menuAt.y < 230 || undefined}
          style={
            {
              left,
              top: menuAt.y,
              "--tip": `${menuAt.x - left}px`,
            } as CSSProperties
          }
        >
          {editing.menu}
        </div>
      )}
    </>
  );
}

/** The layers of a line being bent. It lies over everything, so its ends show on a stop. */
function addEditLayers(
  m: MapLibreMap,
  c: { hot: string; ink: string; paperTone: string; warn: string },
) {
  for (const id of ["edit", "edit-points", "edit-before", "edit-mark"]) {
    m.addSource(id, { type: "geojson", data: lines([]) });
  }
  const kind = (k: string): FilterSpecification => ["==", ["get", "kind"], k];
  const round = { "line-join": "round", "line-cap": "round" } as const;
  m.addLayer({
    id: "edit-before",
    type: "line",
    source: "edit-before",
    layout: round,
    paint: {
      "line-color": c.ink,
      "line-width": 2,
      "line-opacity": 0.5,
      "line-dasharray": [0.2, 2.2],
    },
  });
  m.addLayer({
    id: "edit-glow",
    type: "line",
    source: "edit",
    filter: kind("road"),
    layout: round,
    paint: {
      "line-color": c.hot,
      "line-width": 12,
      "line-blur": 9,
      "line-opacity": 0.4,
    },
  });
  m.addLayer({
    id: "edit-road",
    type: "line",
    source: "edit",
    filter: kind("road"),
    layout: round,
    paint: { "line-color": c.hot, "line-width": 3.5 },
  });
  m.addLayer({
    id: "edit-free",
    type: "line",
    source: "edit",
    filter: kind("free"),
    layout: round,
    paint: { "line-color": c.ink, "line-width": 3 },
  });
  m.addLayer({
    id: "edit-straight",
    type: "line",
    source: "edit",
    filter: kind("straight"),
    paint: {
      "line-color": c.ink,
      "line-width": 2.5,
      "line-dasharray": [2, 2],
    },
  });
  // A road still looked up: where it will run is not known yet.
  m.addLayer({
    id: "edit-wait",
    type: "line",
    source: "edit",
    filter: kind("wait"),
    paint: {
      "line-color": c.hot,
      "line-width": 2,
      "line-opacity": 0.8,
      "line-dasharray": [1, 2],
    },
  });
  m.addLayer({
    id: "edit-none",
    type: "line",
    source: "edit",
    filter: kind("none"),
    paint: {
      "line-color": c.warn,
      "line-width": 3,
      "line-dasharray": [1.5, 1.5],
    },
  });
  // Wider than the line, so a finger can take hold of it.
  m.addLayer({
    id: "edit-hit",
    type: "line",
    source: "edit",
    layout: round,
    paint: { "line-color": c.hot, "line-width": 26, "line-opacity": 0.01 },
  });
  // The line drawn by hand as it grows, and where a press would bend.
  m.addLayer({
    id: "edit-stroke",
    type: "line",
    source: "edit-mark",
    filter: ["!=", ["geometry-type"], "Point"],
    layout: round,
    paint: { "line-color": c.ink, "line-width": 4 },
  });
  m.addLayer({
    id: "edit-ghost",
    type: "circle",
    source: "edit-mark",
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-radius": 6,
      "circle-color": c.hot,
      "circle-opacity": 0.6,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": c.ink,
    },
  });
  m.addLayer({
    id: "edit-points",
    type: "circle",
    source: "edit-points",
    filter: ["==", ["get", "end"], ""],
    paint: {
      "circle-radius": ["case", ["get", "selected"], 9, 6],
      "circle-color": c.ink,
      "circle-stroke-width": ["case", ["get", "selected"], 4, 3],
      "circle-stroke-color": c.hot,
    },
  });
  m.addLayer({
    id: "edit-ends",
    type: "symbol",
    source: "edit-points",
    filter: ["!=", ["get", "end"], ""],
    layout: {
      "icon-image": "end",
      "icon-allow-overlap": true,
      "text-field": ["get", "end"],
      "text-font": ["Noto Sans Bold"],
      "text-size": 12,
      "text-allow-overlap": true,
    },
    paint: { "text-color": c.paperTone },
  });
}

/**
 * Taps and drags on the map of someone signed in. Bending a leg's line: a
 * press on a point or on the line takes hold of it, and the map stays where
 * it is until the release. Returns what stops listening.
 */
function listen(m: MapLibreMap, now: () => MapEditing | undefined) {
  const around = (p: Point, by: number) =>
    [
      [p.x - by, p.y - by],
      [p.x + by, p.y + by],
    ] as [[number, number], [number, number]];
  const under = (p: Point, by: number, layers: string[]) =>
    m.getLayer("edit-hit")
      ? m.queryRenderedFeatures(around(p, by), { layers })[0]
      : undefined;
  const mark = (data: GeoJSON.Feature | null) =>
    m.getSource<GeoJSONSource>("edit-mark")?.setData(data ?? lines([]));
  const POINTS = ["edit-points", "edit-ends"];
  let held: { i: number; from: Point; moved: boolean; fresh: boolean } | null =
    null;
  let stroke: { line: LngLat[]; last: Point } | null = null;
  let touched = 0;
  const far = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

  const press = (e: MapMouseEvent | MapTouchEvent) => {
    const edit = now()?.edit;
    if (!edit) return;
    const touch = "points" in e;
    // A tap is followed by the mouse events browsers make up for it.
    if (touch) touched = Date.now();
    else if (Date.now() - touched < 800) return;
    // Two fingers move the map, as ever.
    if (touch && e.points.length > 1) {
      if (held?.fresh || held?.moved) edit.onDrop();
      held = null;
      stroke = null;
      mark(null);
      return;
    }
    if (!touch && e.originalEvent.button !== 0) return;
    const at: LngLat = [e.lngLat.lng, e.lngLat.lat];
    const reach = touch ? REACH.touch : REACH.mouse;
    if (edit.byHand) {
      e.preventDefault();
      stroke = { line: [at], last: e.point };
      return;
    }
    const point = under(e.point, reach, POINTS);
    if (point) {
      e.preventDefault();
      held = {
        i: point.properties.index,
        from: e.point,
        moved: false,
        fresh: false,
      };
      return;
    }
    const line = under(e.point, touch ? 6 : 3, ["edit-hit"]);
    if (line) {
      e.preventDefault();
      mark(null);
      edit.onInsert(line.properties.index, at);
      held = {
        i: line.properties.index,
        from: e.point,
        moved: false,
        fresh: true,
      };
    }
  };
  const drag = (e: MapMouseEvent | MapTouchEvent) => {
    const edit = now()?.edit;
    if (!edit) return;
    const at: LngLat = [e.lngLat.lng, e.lngLat.lat];
    if (stroke) {
      if (far(e.point, stroke.last) < 4) return;
      stroke.line.push(at);
      stroke.last = e.point;
      mark({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: stroke.line },
      });
      return;
    }
    if (held) {
      if (!held.moved && far(e.point, held.from) < 5) return;
      held.moved = true;
      edit.onMove(held.i, at);
      return;
    }
    if ("points" in e) return;
    // The mouse over the line: show that a press here bends it.
    const canvas = m.getCanvas();
    if (edit.byHand) {
      canvas.style.cursor = "crosshair";
    } else if (under(e.point, REACH.mouse, POINTS)) {
      canvas.style.cursor = "grab";
      mark(null);
    } else if (under(e.point, 3, ["edit-hit"])) {
      canvas.style.cursor = "grab";
      mark({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: at },
      });
    } else {
      canvas.style.cursor = "";
      mark(null);
    }
  };
  const release = () => {
    const edit = now()?.edit;
    if (stroke) {
      edit?.onStroke(stroke.line);
      stroke = null;
      mark(null);
    }
    if (held) {
      if (held.moved || held.fresh) edit?.onDrop();
      else edit?.onSelect(held.i);
      held = null;
    }
  };
  m.on("mousedown", press);
  m.on("touchstart", press);
  m.on("mousemove", drag);
  m.on("touchmove", drag);
  // The release may come outside the map.
  window.addEventListener("mouseup", release);
  window.addEventListener("touchend", release);
  window.addEventListener("touchcancel", release);

  m.on("click", (e) => {
    const editing = now();
    if (!editing) return;
    const { edit, picking } = editing;
    if (edit) {
      // A tap beside the line closes the menu of a point.
      if (!under(e.point, REACH.touch, POINTS)) edit.onSelect(null);
      return;
    }
    if (picking) {
      editing.onPick(e.lngLat.lng, e.lngLat.lat);
      return;
    }
    // A finger is wider than a pin, so look a little around the tap.
    const hit = m.getLayer("places")
      ? m.queryRenderedFeatures(around(e.point, 8), {
          layers: ["places", "stops"],
        })[0]
      : undefined;
    if (!hit) editing.onMiss();
    else if (hit.layer.id === "stops")
      editing.onSelectStop(Number(hit.properties.label));
    else if (hit.properties.id !== undefined)
      editing.onSelectPlace(hit.properties.id);
  });

  return () => {
    window.removeEventListener("mouseup", release);
    window.removeEventListener("touchend", release);
    window.removeEventListener("touchcancel", release);
  };
}
