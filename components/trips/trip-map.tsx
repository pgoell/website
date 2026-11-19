"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Look } from "@/lib/trips/look";
import { arc } from "@/lib/trips/plan";
import { lengthOf, type Stretch } from "@/lib/trips/route";
import type {
  LngLat,
  PlaceStatus,
  Trip,
  TripPlace,
  TripStop,
} from "@/lib/trips/types";
import {
  cameraFor,
  type HtmlLayer,
  htmlLayer,
  INKS,
  loadMaps,
  MAP_STYLES,
  mapOptions,
  moveTo,
  label as nameLabel,
  type Pad,
  type Pin,
  path,
  polyline,
  SATELLITE_STYLE,
  square,
  toSegment,
} from "./gmap";
import s from "./trips.module.css";

/** A place as the map of someone signed in knows it. */
type MapPlace = TripPlace & { id?: number; status?: PlaceStatus };

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
  /** Google's satellite images in place of the drawn map. */
  satellite?: { on: boolean; label: string; onToggle: () => void };
  /** The label of the button that shows where you are. */
  locate?: string;
  onPick: (lng: number, lat: number) => void;
  onSelectPlace: (id: number) => void;
  onSelectStop: (position: number) => void;
  /** A tap that hit no marker. */
  onMiss: () => void;
};

/** What the map says around itself, in the page's language. */
export type MapWords = {
  label: string;
  /** What to say when the map cannot start. */
  broken: string;
  zoomIn: string;
  zoomOut: string;
  /** For a visitor: what to say before Google's map loads, and the button. */
  consent: string;
  load: string;
};

/** The map's words from the trips messages. */
export const mapWords = (t: (key: string) => string): MapWords => ({
  label: t("map"),
  broken: t("noMap"),
  zoomIn: t("zoomIn"),
  zoomOut: t("zoomOut"),
  consent: t("mapConsent"),
  load: t("loadMap"),
});

/** A visitor loads Google's map only after saying yes; the yes is kept here. */
export const CONSENT_KEY = "trips.googleMaps";
function consented() {
  try {
    return localStorage.getItem(CONSENT_KEY) === "yes";
  } catch {
    return false;
  }
}

/** How far around a press a point or the line still counts as hit, in pixels. */
const REACH = { mouse: 10, touch: 22 };
const LINE_REACH = { mouse: 9, touch: 16 };
/** An end of a line this near a stop, in metres, counts as on it. */
const ON_STOP = 100;
/** Names of places show from this zoom on. */
const NAMES_FROM = 11;

type LineName =
  | "flights"
  | "groundGlow"
  | "ground"
  | "pickedGlow"
  | "picked"
  | "stroke";

/**
 * A map of one trip on Google Maps: its line, its stops and its places. The
 * map fills its box and is the page there, so one finger and the wheel move it.
 * A new look needs a new map: give the component a key that holds the look.
 */
export function TripMap({
  trip,
  look,
  picked,
  focus,
  pad,
  mark,
  words,
  mapsKey,
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
  words: MapWords;
  /** The browser key for Google Maps. */
  mapsKey: string | undefined;
  /** One point in `focus` is a place: come close, not just near. */
  closeUp?: boolean;
  /** Only for someone signed in. Without it the map is read-only. */
  editing?: MapEditing;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const base = useRef<HtmlLayer | null>(null);
  const top = useRef<HtmlLayer | null>(null);
  const lines = useRef<Lines | null>(null);
  const editLines = useRef<google.maps.Polyline[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [allowed, setAllowed] = useState(!!editing);
  const [near, setNear] = useState(false);
  const [me, setMe] = useState<LngLat | null>(null);
  const [ghost, setGhost] = useState<LngLat | null>(null);
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
  const ink = INKS[look];
  const editable = editing !== undefined;

  // A visitor who said yes before is not asked again.
  useEffect(() => {
    if (!editable && consented()) setAllowed(true);
  }, [editable]);

  useEffect(() => {
    if (!allowed) return;
    let gone = false;
    let stopEditing: (() => void) | undefined;
    loadMaps(mapsKey).then(
      () => {
        const el = container.current;
        if (gone || !el) return;
        const { trip, focus, pad, look, editable } = first.current;
        const c = INKS[look];
        const cam = cameraFor(
          focus,
          { width: el.clientWidth, height: el.clientHeight },
          pad,
          13,
        );
        const m = new google.maps.Map(el, {
          ...mapOptions(look),
          center: cam?.center ?? { lat: 35.68, lng: 139.76 },
          zoom: cam?.zoom ?? 5,
        });
        map.current = m;
        const made = new Lines(m, {
          flights: { color: c.ink, width: 1.4, opacity: 0.6, dash: [2, 5] },
          groundGlow: { color: c.route, width: 9, opacity: 0.16, z: 1 },
          ground: { color: c.route, width: 2.5, z: 2 },
          pickedGlow: { color: c.picked, width: 9, opacity: 0.2, z: 3 },
          picked: { color: c.picked, width: 2.5, z: 4 },
          stroke: { color: c.ink, width: 4, z: 20 },
        });
        lines.current = made;
        made.set(
          "flights",
          trip.legs
            .filter((l) => l.mode === "flight")
            .map((l) => arc(l.path[0] as LngLat, l.path.at(-1) as LngLat)),
        );
        base.current = htmlLayer(m);
        top.current = htmlLayer(m);
        const onZoom = () => setNear((m.getZoom() ?? 0) >= NAMES_FROM);
        m.addListener("zoom_changed", onZoom);
        onZoom();
        if (editable) {
          stopEditing = listen(
            m,
            el,
            top.current,
            () => live.current,
            setGhost,
            (line) => made.set("stroke", line.length ? [line] : []),
          );
        }
        setLoaded(true);
      },
      () => setFailed(true),
    );
    return () => {
      gone = true;
      stopEditing?.();
      base.current?.remove();
      top.current?.remove();
      lines.current?.remove();
      for (const l of editLines.current) l.setMap(null);
      map.current = null;
    };
  }, [allowed, mapsKey]);

  // The trip's ground legs, and the day's lines over them.
  useEffect(() => {
    const l = lines.current;
    if (!loaded || !l) return;
    const ground = trip.legs
      .filter((x) => x.mode === "ground")
      .map((x) => x.path);
    l.set("ground", ground);
    l.set("groundGlow", ground);
  }, [loaded, trip.legs]);
  useEffect(() => {
    const l = lines.current;
    if (!loaded || !l) return;
    l.set("picked", picked);
    l.set("pickedGlow", picked);
  }, [loaded, picked]);

  // Stops, places, the ring of the marked stop and where you are.
  const numbered = editing?.numbered ?? false;
  useEffect(() => {
    const layer = base.current;
    if (!loaded || !layer) return;
    const now = () => live.current;
    const pins: Pin[] = [];
    if (mark) {
      const ring = document.createElement("div");
      Object.assign(ring.style, {
        width: "38px",
        height: "38px",
        borderRadius: "50%",
        border: `2px solid ${ink.picked}`,
        boxShadow: `0 0 18px 6px ${ink.picked}33`,
        boxSizing: "border-box",
      });
      pins.push({ at: [mark.lng, mark.lat], el: ring, z: 2 });
      // Only the marked stop is named, so the map stays calm.
      pins.push({
        at: [mark.lng, mark.lat],
        el: nameLabel(mark.name, ink.route, ink.ground, 12),
        anchor: "left",
        offset: [24, 0],
        z: 6,
      });
    }
    (trip.places as MapPlace[]).forEach((p, i) => {
      if (p.lat === null || p.lng === null) return;
      const at: LngLat = [p.lng, p.lat];
      const idea = editable && p.status === "idea";
      const n = editable && numbered ? String(i + 1) : "";
      const size = n ? 21 : 13;
      const el = idea
        ? square(size, ink.ground, ink.picked, n, ink.picked)
        : square(size, ink.place, ink.ground, n, ink.ground);
      const id = p.id;
      pins.push(
        editable && id !== undefined
          ? {
              at,
              el: hitArea(el, () =>
                tapPin(now, at, () => now()?.onSelectPlace(id)),
              ),
              hit: true,
              z: 3,
            }
          : { at, el, z: 3 },
      );
      if (near) {
        pins.push({
          at,
          el: nameLabel(p.name, ink.ink, ink.ground),
          anchor: "top",
          offset: [0, size / 2 + 4],
          z: 3,
        });
      }
    });
    for (const st of trip.stops) {
      const el = square(24, ink.ground, ink.route, String(st.position));
      const at: LngLat = [st.lng, st.lat];
      pins.push(
        editable
          ? {
              at,
              el: hitArea(el, () =>
                tapPin(now, at, () => now()?.onSelectStop(st.position)),
              ),
              hit: true,
              z: 5,
            }
          : { at, el, z: 5 },
      );
    }
    if (me) {
      const dot = document.createElement("div");
      Object.assign(dot.style, {
        width: "14px",
        height: "14px",
        boxSizing: "border-box",
        borderRadius: "50%",
        background: "#3b82f6",
        border: "2px solid #fff",
        boxShadow: "0 0 0 6px rgba(59,130,246,0.25)",
      });
      pins.push({ at: me, el: dot, z: 7 });
    }
    layer.set(pins);
  }, [
    loaded,
    trip.places,
    trip.stops,
    mark,
    numbered,
    editable,
    near,
    me,
    ink,
  ]);

  useEffect(() => {
    const m = map.current;
    const el = container.current;
    if (!loaded || !m || !el || focus.length === 0) return;
    // One point is a stop in open country: stay far enough out to see where
    // it lies. A place shown on its own is looked at close up.
    const cam = cameraFor(
      focus,
      { width: el.clientWidth, height: el.clientHeight },
      pad,
      focus.length === 1 && !closeUp ? 10.5 : closeUp ? 16 : 15,
    );
    if (cam) moveTo(m, cam);
  }, [loaded, focus, pad, closeUp]);

  // ---------- only for someone signed in ----------

  // The line being bent. The day's own line and the other legs step back.
  const edit = editing?.edit ?? null;
  const bending = edit !== null;
  useEffect(() => {
    const l = lines.current;
    if (!loaded || !l || !editable) return;
    l.style("picked", { visible: !bending });
    l.style("pickedGlow", { visible: !bending });
    l.style("ground", { strokeOpacity: bending ? 0.3 : 1 });
    l.style("groundGlow", { strokeOpacity: bending ? 0.05 : 0.16 });
  }, [loaded, editable, bending]);

  const picking = editing?.picking ?? false;
  useEffect(() => {
    const m = map.current;
    if (!loaded || !m || !editable) return;
    m.setOptions({ draggableCursor: picking ? "crosshair" : null });
  }, [loaded, editable, picking]);

  // Satellite images take the place of the drawn map, with the names of
  // places and roads on them. Everything of the trip stays.
  const satOn = editing?.satellite?.on ?? false;
  useEffect(() => {
    const m = map.current;
    if (!loaded || !m) return;
    m.setOptions({
      mapTypeId: satOn ? "hybrid" : "roadmap",
      styles: satOn ? SATELLITE_STYLE : MAP_STYLES[look],
    });
  }, [loaded, satOn, look]);

  const stretches = edit?.stretches;
  const points = edit?.points;
  const stops = trip.stops;
  const selected = edit?.selected ?? null;
  const before = edit?.before;
  useEffect(() => {
    const m = map.current;
    if (!loaded || !m || !editable) return;
    for (const l of editLines.current) l.setMap(null);
    const made: google.maps.Polyline[] = [];
    const draw = (line: LngLat[], o: Parameters<typeof polyline>[1]) => {
      const p = polyline(m, { z: 10, ...o });
      p.setPath(path(line));
      made.push(p);
    };
    if (before?.length)
      draw(before, { color: ink.ink, width: 2, opacity: 0.5, dash: [1, 6] });
    for (const x of stretches ?? []) {
      if (x.kind === "road") {
        draw(x.line, { color: ink.picked, width: 12, opacity: 0.3 });
        draw(x.line, { color: ink.picked, width: 3.5, z: 11 });
      } else if (x.kind === "free") {
        draw(x.line, { color: ink.ink, width: 3, z: 11 });
      } else if (x.kind === "straight") {
        draw(x.line, { color: ink.ink, width: 2.5, dash: [2, 4], z: 11 });
      } else if (x.kind === "wait") {
        // A road still looked up: where it will run is not known yet.
        draw(x.line, {
          color: ink.picked,
          width: 2,
          opacity: 0.8,
          dash: [1, 4],
          z: 11,
        });
      } else {
        draw(x.line, { color: ink.warn, width: 3, dash: [2, 3], z: 11 });
      }
    }
    editLines.current = made;
  }, [loaded, editable, stretches, before, ink]);

  // The points of the line being bent, and where a press would bend it.
  useEffect(() => {
    const layer = top.current;
    if (!loaded || !layer || !editable) return;
    const pins: Pin[] = (points ?? []).map((p, i, all): Pin => {
      const end = i === 0 ? "A" : i === all.length - 1 ? "B" : "";
      if (!end) {
        const on = i === selected;
        const d = document.createElement("div");
        Object.assign(d.style, {
          width: `${on ? 18 : 12}px`,
          height: `${on ? 18 : 12}px`,
          borderRadius: "50%",
          background: ink.ink,
          border: `${on ? 4 : 3}px solid ${ink.picked}`,
          boxSizing: "border-box",
        });
        return { at: p, el: d, z: 12 };
      }
      const stop = stops.find((x) => lengthOf([p, [x.lng, x.lat]]) < ON_STOP);
      // An end on a stop is that stop's own box and number, in orange.
      const el = stop
        ? square(24, ink.ground, ink.picked, String(stop.position), ink.picked)
        : square(22, ink.picked, ink.ground, end, ink.ground);
      return { at: p, el, z: 13 };
    });
    if (ghost) {
      const g = document.createElement("div");
      Object.assign(g.style, {
        width: "12px",
        height: "12px",
        boxSizing: "border-box",
        borderRadius: "50%",
        background: ink.picked,
        opacity: "0.6",
        border: `1.5px solid ${ink.ink}`,
      });
      pins.push({ at: ghost, el: g, z: 11 });
    }
    layer.set(pins);
  }, [loaded, editable, points, selected, stops, ghost, ink]);

  // The menu of the picked point follows the map.
  const menuPoint = selected === null ? undefined : points?.[selected];
  useEffect(() => {
    const layer = top.current;
    const el = container.current;
    if (!loaded || !layer || !el || !menuPoint) {
      setMenuAt(null);
      return;
    }
    const place = () => {
      const p = layer.toPixel(menuPoint);
      if (p) setMenuAt({ x: p.x, y: p.y, width: el.clientWidth });
    };
    place();
    const stop = layer.watch(place);
    return () => {
      stop();
    };
  }, [loaded, menuPoint]);

  // Where you are, while the button is on.
  const [locating, setLocating] = useState(false);
  useEffect(() => {
    if (!locating || !navigator.geolocation) return;
    let firstFix = true;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const at: LngLat = [p.coords.longitude, p.coords.latitude];
        setMe(at);
        const m = map.current;
        if (firstFix && m) {
          firstFix = false;
          moveTo(m, {
            center: { lat: at[1], lng: at[0] },
            zoom: Math.max(m.getZoom() ?? 0, 15),
          });
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: true },
    );
    return () => {
      navigator.geolocation.clearWatch(id);
      setMe(null);
    };
  }, [locating]);

  if (failed) return <p className={s.noMap}>{words.broken}</p>;
  if (!allowed) {
    return (
      <div className={s.consent}>
        <p>{words.consent}</p>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(CONSENT_KEY, "yes");
            } catch {}
            setAllowed(true);
          }}
        >
          {words.load}
        </button>
      </div>
    );
  }
  const zoomBy = (d: number) => {
    const m = map.current;
    if (m)
      moveTo(m, {
        center: m.getCenter()?.toJSON() ?? { lat: 0, lng: 0 },
        zoom: Math.round((m.getZoom() ?? 0) + d),
      });
  };
  const left = menuAt
    ? Math.min(Math.max(menuAt.x, 136), menuAt.width - 136)
    : 0;
  return (
    <>
      <div
        ref={container}
        className={s.map}
        role="img"
        aria-label={words.label}
      />
      {loaded && (
        <div className={s.mapButtons}>
          <button
            type="button"
            aria-label={words.zoomIn}
            title={words.zoomIn}
            onClick={() => zoomBy(1)}
          >
            +
          </button>
          <button
            type="button"
            aria-label={words.zoomOut}
            title={words.zoomOut}
            onClick={() => zoomBy(-1)}
          >
            −
          </button>
          {editing?.locate && (
            <button
              type="button"
              aria-label={editing.locate}
              title={editing.locate}
              aria-pressed={locating}
              onClick={() => setLocating((on) => !on)}
            >
              <svg viewBox="0 0 16 16" className={s.mapIco} aria-hidden="true">
                <circle cx="8" cy="8" r="4.5" />
                <path d="M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15" />
              </svg>
            </button>
          )}
          {editing?.satellite && (
            <button
              type="button"
              className={s.satButton}
              aria-label={editing.satellite.label}
              title={editing.satellite.label}
              aria-pressed={satOn}
              onClick={editing.satellite.onToggle}
            >
              SAT
            </button>
          )}
        </div>
      )}
      {editing?.menu && menuAt && (
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

/**
 * The map's lines by name. A google.maps.Polyline draws one line, so each
 * name holds as many as it has lines, all in the same style.
 */
class Lines {
  private all = new Map<LineName, google.maps.Polyline[]>();
  private looks = new Map<LineName, Parameters<typeof polyline>[1]>();
  private extra = new Map<LineName, google.maps.PolylineOptions>();
  constructor(
    private m: google.maps.Map,
    looks: Record<LineName, Parameters<typeof polyline>[1]>,
  ) {
    for (const [k, v] of Object.entries(looks))
      this.looks.set(k as LineName, v);
  }
  set(name: LineName, paths: LngLat[][]) {
    for (const p of this.all.get(name) ?? []) p.setMap(null);
    const o = this.looks.get(name);
    if (!o) return;
    const extra = this.extra.get(name) ?? {};
    this.all.set(
      name,
      paths.map((line) => {
        const p = polyline(this.m, o);
        p.setOptions({ ...extra, path: path(line) });
        return p;
      }),
    );
  }
  style(name: LineName, o: google.maps.PolylineOptions) {
    // A dashed line has no stroke of its own; its opacity lives in its icons.
    this.extra.set(name, { ...this.extra.get(name), ...o });
    for (const p of this.all.get(name) ?? []) p.setOptions(o);
  }
  remove() {
    for (const ps of this.all.values()) for (const p of ps) p.setMap(null);
    this.all.clear();
  }
}

/** A marker with a wider invisible ring around it, so a finger can hit it. */
function hitArea(el: HTMLElement, onTap: () => void) {
  const box = document.createElement("div");
  Object.assign(box.style, { padding: "8px", cursor: "pointer" });
  box.append(el);
  box.addEventListener("click", (e) => {
    e.stopPropagation();
    onTap();
  });
  return box;
}

/** A tap on a pin: picking sets a pin there, bending a line ignores it. */
function tapPin(
  now: () => MapEditing | undefined,
  at: LngLat,
  select: () => void,
) {
  const editing = now();
  if (!editing || editing.edit) return;
  if (editing.picking) editing.onPick(at[0], at[1]);
  else select();
}

type Pt = { x: number; y: number };

/**
 * Presses and drags on the map of someone signed in, for bending a leg's
 * line. A press on a point or on the line takes hold of it, and Google never
 * hears of it, so the map stays where it is until the release. Taps for
 * picking and missing come from Google's own click. Returns what stops it.
 */
function listen(
  m: google.maps.Map,
  box: HTMLDivElement,
  layer: HtmlLayer,
  now: () => MapEditing | undefined,
  setGhost: (at: LngLat | null) => void,
  showStroke: (line: LngLat[]) => void,
) {
  let held: { i: number; from: Pt; moved: boolean; fresh: boolean } | null =
    null;
  let stroke: { line: LngLat[]; last: Pt } | null = null;
  let capturing = false;
  let quietUntil = 0;
  const fingers = new Set<number>();
  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = box.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const inside = (e: Event) => box.contains(e.target as Node);
  const far = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

  const pointNear = (edit: RouteOnMap, p: Pt, reach: number) => {
    let best: number | null = null;
    let most = reach;
    edit.points.forEach((at, i) => {
      const q = layer.toPixel(at);
      if (!q) return;
      const d = far(p, q);
      if (d <= most) {
        most = d;
        best = i;
      }
    });
    return best;
  };
  const lineNear = (edit: RouteOnMap, p: Pt, reach: number) => {
    let best: number | null = null;
    let most = reach;
    edit.stretches.forEach((x, i) => {
      const px = x.line.map((at) => layer.toPixel(at));
      for (let k = 1; k < px.length; k++) {
        const a = px[k - 1];
        const b = px[k];
        if (!a || !b) continue;
        const d = toSegment(p, a, b);
        if (d <= most) {
          most = d;
          best = i + 1;
        }
      }
    });
    return best;
  };

  const swallow = (e: Event) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
  };
  const down = (e: PointerEvent) => {
    if (!inside(e)) return;
    const edit = now()?.edit;
    if (!edit) return;
    const touch = e.pointerType !== "mouse";
    fingers.add(e.pointerId);
    // Two fingers move the map, as ever.
    if (fingers.size > 1) {
      if (held?.fresh || held?.moved) edit.onDrop();
      held = null;
      stroke = null;
      capturing = false;
      showStroke([]);
      return;
    }
    if (!touch && e.button !== 0) return;
    const p = local(e);
    const at = layer.toLngLat(p.x, p.y);
    if (!at) return;
    if (edit.byHand) {
      swallow(e);
      capturing = true;
      stroke = { line: [at], last: p };
      return;
    }
    const point = pointNear(edit, p, touch ? REACH.touch : REACH.mouse);
    if (point !== null) {
      swallow(e);
      capturing = true;
      held = { i: point, from: p, moved: false, fresh: false };
      return;
    }
    const line = lineNear(edit, p, touch ? LINE_REACH.touch : LINE_REACH.mouse);
    if (line !== null) {
      swallow(e);
      capturing = true;
      setGhost(null);
      edit.onInsert(line, at);
      held = { i: line, from: p, moved: false, fresh: true };
    }
  };
  const move = (e: PointerEvent) => {
    if (capturing) swallow(e);
    const edit = now()?.edit;
    if (!edit) return;
    const p = local(e);
    if (stroke) {
      if (far(p, stroke.last) < 4) return;
      const at = layer.toLngLat(p.x, p.y);
      if (!at) return;
      stroke.line.push(at);
      stroke.last = p;
      showStroke(stroke.line);
      return;
    }
    if (held) {
      if (!held.moved && far(p, held.from) < 5) return;
      held.moved = true;
      const at = layer.toLngLat(p.x, p.y);
      if (at) edit.onMove(held.i, at);
      return;
    }
    if (e.pointerType !== "mouse" || !inside(e)) return;
    // The mouse over the line: show that a press here bends it.
    if (edit.byHand) {
      m.setOptions({ draggableCursor: "crosshair" });
      setGhost(null);
    } else if (pointNear(edit, p, REACH.mouse) !== null) {
      m.setOptions({ draggableCursor: "grab" });
      setGhost(null);
    } else if (lineNear(edit, p, LINE_REACH.mouse) !== null) {
      m.setOptions({ draggableCursor: "grab" });
      setGhost(layer.toLngLat(p.x, p.y));
    } else {
      m.setOptions({ draggableCursor: null });
      setGhost(null);
    }
  };
  const up = (e: PointerEvent) => {
    fingers.delete(e.pointerId);
    if (!capturing) return;
    swallow(e);
    capturing = false;
    quietUntil = Date.now() + 400;
    const edit = now()?.edit;
    if (stroke) {
      edit?.onStroke(stroke.line);
      stroke = null;
      showStroke([]);
    }
    if (held) {
      if (held.moved || held.fresh) edit?.onDrop();
      else edit?.onSelect(held.i);
      held = null;
    }
  };
  // Google listens to mouse and touch events as well as pointer events:
  // while a point is held, and just after, none of them reach it.
  const hush = (e: Event) => {
    if (capturing || (Date.now() < quietUntil && inside(e))) swallow(e);
  };
  const opts = { capture: true, passive: false } as const;
  window.addEventListener("pointerdown", down, opts);
  window.addEventListener("pointermove", move, opts);
  window.addEventListener("pointerup", up, opts);
  window.addEventListener("pointercancel", up, opts);
  const hushed = [
    "mousedown",
    "mousemove",
    "mouseup",
    "touchstart",
    "touchmove",
    "touchend",
    "click",
  ] as const;
  for (const t of hushed) window.addEventListener(t, hush, opts);

  const click = m.addListener("click", (e: google.maps.MapMouseEvent) => {
    const editing = now();
    if (!editing || !e.latLng) return;
    const { edit, picking } = editing;
    if (edit) {
      // A tap beside the line closes the menu of a point.
      edit.onSelect(null);
      return;
    }
    if (picking) {
      editing.onPick(e.latLng.lng(), e.latLng.lat());
      return;
    }
    editing.onMiss();
  });

  return () => {
    click.remove();
    window.removeEventListener("pointerdown", down, opts);
    window.removeEventListener("pointermove", move, opts);
    window.removeEventListener("pointerup", up, opts);
    window.removeEventListener("pointercancel", up, opts);
    for (const t of hushed) window.removeEventListener(t, hush, opts);
  };
}
