/**
 * Google Maps for the trip pages: loading the script once, the Night and Day
 * map styles, and a layer of plain HTML on the map for stops, places, labels
 * and the points of a line being bent. Everything drawn here is ours, so it
 * keeps the look of the camera screen; only the map under it is Google's.
 */
import type { Look } from "@/lib/trips/look";
import type { LngLat } from "@/lib/trips/types";

/** The colours drawn over the map, for the dark screen and for paper. */
export const INKS = {
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
export type Inks = (typeof INKS)[Look];

let script: Promise<void> | undefined;

/**
 * Loads Google's script once per page and the libraries asked for. Without a
 * key Google still draws, marked "for development purposes only". A failure
 * stays a failure until the page is loaded again.
 */
export function loadGoogle(key: string | undefined): Promise<void> {
  script ??= new Promise<void>((resolve, reject) => {
    const w = window as unknown as { gmReady: () => void };
    w.gmReady = () => resolve();
    const el = document.createElement("script");
    const k = key ? `key=${encodeURIComponent(key)}&` : "";
    el.src = `https://maps.googleapis.com/maps/api/js?${k}v=weekly&loading=async&callback=gmReady`;
    el.onerror = () => reject(new Error("Google Maps did not load"));
    document.head.append(el);
  });
  return script;
}

export async function loadMaps(key: string | undefined) {
  await loadGoogle(key);
  return (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
}

type Style = google.maps.MapTypeStyle;
const el = (
  featureType: string,
  elementType: string,
  stylers: Style["stylers"],
): Style => ({ featureType, elementType, stylers });

/**
 * Night: the dark camera screen. Water deep blue, roads in quiet greys with
 * expressways a dim warm tone, so our green route and orange places stay the
 * brightest lines. No road shields, junction signs or transit labels.
 */
const NIGHT: Style[] = [
  el("all", "geometry", [{ color: "#090b0c" }]),
  el("all", "labels.text.fill", [{ color: "#8e918d" }]),
  el("all", "labels.text.stroke", [{ color: "#050606" }, { weight: 3 }]),
  el("all", "labels.icon", [{ visibility: "off" }]),
  el("poi", "all", [{ visibility: "off" }]),
  el("poi.park", "geometry", [{ visibility: "on" }, { color: "#0d1813" }]),
  el("landscape.natural", "geometry", [{ color: "#0b0e0e" }]),
  el("landscape.man_made", "geometry", [{ color: "#101416" }]),
  el("water", "geometry", [{ color: "#0b1624" }]),
  el("water", "labels.text.fill", [{ color: "#46678c" }]),
  el("water", "labels.text.stroke", [{ color: "#0b1624" }]),
  el("road", "geometry", [{ color: "#262c2f" }]),
  el("road", "labels", [{ visibility: "simplified" }]),
  el("road.local", "labels", [{ visibility: "off" }]),
  el("road", "labels.icon", [{ visibility: "off" }]),
  el("road.arterial", "geometry", [{ color: "#353d41" }]),
  el("road.highway", "geometry", [{ color: "#3a3830" }]),
  el("road.highway", "labels.text.fill", [{ color: "#9a8f78" }]),
  el("road.highway.controlled_access", "geometry", [{ color: "#4f4530" }]),
  el("transit.line", "geometry", [{ color: "#3a4145" }]),
  el("transit.station", "all", [{ visibility: "off" }]),
  el("transit", "labels", [{ visibility: "off" }]),
  el("administrative", "geometry.stroke", [{ color: "#4a4c4a" }]),
  el("administrative.locality", "labels.text.fill", [{ color: "#c8cac6" }]),
  el("administrative.neighborhood", "labels.text.fill", [{ color: "#6e716d" }]),
  el("administrative.country", "labels.text.fill", [{ color: "#9a9c98" }]),
];

/** Day: paper and ink, with the same quiet roads as Night. */
const DAY: Style[] = [
  el("all", "geometry", [{ color: "#eeede5" }]),
  el("all", "labels.text.fill", [{ color: "#6a6c64" }]),
  el("all", "labels.text.stroke", [{ color: "#f4f2e8" }, { weight: 3 }]),
  el("all", "labels.icon", [{ visibility: "off" }]),
  el("poi", "all", [{ visibility: "off" }]),
  el("poi.park", "geometry", [{ visibility: "on" }, { color: "#e3ebdc" }]),
  el("landscape.natural", "geometry", [{ color: "#eeede5" }]),
  el("landscape.man_made", "geometry", [{ color: "#e6e5dc" }]),
  el("water", "geometry", [{ color: "#d7e0e5" }]),
  el("water", "labels.text.fill", [{ color: "#7995b0" }]),
  el("water", "labels.text.stroke", [{ color: "#d7e0e5" }]),
  el("road", "geometry", [{ color: "#d8dbd4" }]),
  el("road", "labels", [{ visibility: "simplified" }]),
  el("road.local", "labels", [{ visibility: "off" }]),
  el("road", "labels.icon", [{ visibility: "off" }]),
  el("road.arterial", "geometry", [{ color: "#c8ccc6" }]),
  el("road.highway", "geometry", [{ color: "#dcd8c8" }]),
  el("road.highway", "labels.text.fill", [{ color: "#8a7f68" }]),
  el("road.highway.controlled_access", "geometry", [{ color: "#e6d2a8" }]),
  el("transit.line", "geometry", [{ color: "#babeba" }]),
  el("transit.station", "all", [{ visibility: "off" }]),
  el("transit", "labels", [{ visibility: "off" }]),
  el("administrative", "geometry.stroke", [{ color: "#b5b7b0" }]),
  el("administrative.locality", "labels.text.fill", [{ color: "#2c2e28" }]),
  el("administrative.neighborhood", "labels.text.fill", [{ color: "#8a8c84" }]),
  el("administrative.country", "labels.text.fill", [{ color: "#55574f" }]),
];

export const MAP_STYLES: Record<Look, Style[]> = { night: NIGHT, day: DAY };

/**
 * Satellite: Google's photos with only place and road names on them, no shop
 * pins, road shields or station labels, so our stops and places stand out.
 */
export const SATELLITE_STYLE: Style[] = [
  el("poi", "all", [{ visibility: "off" }]),
  el("transit", "all", [{ visibility: "off" }]),
  el("road", "labels.icon", [{ visibility: "off" }]),
  el("road.local", "labels", [{ visibility: "off" }]),
];

export const toLatLng = ([lng, lat]: LngLat) => ({ lat, lng });
export const path = (line: LngLat[]) => line.map(toLatLng);

/** Options every trip map shares: our own buttons, no Google ones. */
export function mapOptions(look: Look): google.maps.MapOptions {
  return {
    styles: MAP_STYLES[look],
    backgroundColor: INKS[look].ground,
    disableDefaultUI: true,
    clickableIcons: false,
    keyboardShortcuts: true,
    gestureHandling: "greedy",
    isFractionalZoomEnabled: true,
    minZoom: 2,
  };
}

export type Pad = { top: number; right: number; bottom: number; left: number };

/**
 * The centre and zoom that show `points` inside the map's box less the pad,
 * no closer than `maxZoom`. Web Mercator, the same sums Google makes.
 */
export function cameraFor(
  points: LngLat[],
  size: { width: number; height: number },
  pad: Pad,
  maxZoom: number,
): { center: google.maps.LatLngLiteral; zoom: number } | null {
  if (points.length === 0) return null;
  const x = (lng: number) => (lng + 180) / 360;
  const y = (lat: number) => {
    const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
    return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
  };
  const xs = points.map((p) => x(p[0]));
  const ys = points.map((p) => y(p[1]));
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const w = Math.max(1, size.width - pad.left - pad.right);
  const h = Math.max(1, size.height - pad.top - pad.bottom);
  const fit = Math.min(
    x1 > x0 ? Math.log2(w / 256 / (x1 - x0)) : maxZoom,
    y1 > y0 ? Math.log2(h / 256 / (y1 - y0)) : maxZoom,
  );
  const zoom = Math.max(1, Math.min(maxZoom, fit));
  // The middle of the points, moved so that it sits in the middle of the free box.
  const scale = 256 * 2 ** zoom;
  const cx = (x0 + x1) / 2 + (pad.right - pad.left) / 2 / scale;
  const cy = (y0 + y1) / 2 + (pad.bottom - pad.top) / 2 / scale;
  const lng = cx * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * cy))) * 180) / Math.PI;
  return { center: { lat, lng }, zoom };
}

/** Moves the camera, gliding unless the visitor asks for less motion. */
export function moveTo(
  m: google.maps.Map,
  cam: { center: google.maps.LatLngLiteral; zoom: number },
) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    m.moveCamera(cam);
    return;
  }
  const from = m.getCenter();
  const z0 = m.getZoom();
  if (!from || z0 === undefined) return m.moveCamera(cam);
  const start = performance.now();
  const span = 650;
  const a = { lat: from.lat(), lng: from.lng() };
  // Out a little and back in on a long way, so the move can be followed.
  const far =
    Math.hypot(cam.center.lat - a.lat, cam.center.lng - a.lng) >
    360 / 2 ** Math.min(z0, cam.zoom);
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / span);
    const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    const dip = far ? Math.sin(Math.PI * t) * 1.5 : 0;
    m.moveCamera({
      center: {
        lat: a.lat + (cam.center.lat - a.lat) * e,
        lng: a.lng + (cam.center.lng - a.lng) * e,
      },
      zoom: z0 + (cam.zoom - z0) * e - dip,
    });
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** A square marker with an optional number in it. */
export function square(
  size: number,
  fill: string,
  stroke: string,
  text = "",
  textColor = stroke,
): HTMLDivElement {
  const d = document.createElement("div");
  Object.assign(d.style, {
    width: `${size}px`,
    height: `${size}px`,
    boxSizing: "border-box",
    background: fill,
    border: `2px solid ${stroke}`,
    color: textColor,
    font: `700 ${size > 16 ? 11 : 9}px/1 var(--semi, sans-serif)`,
    display: "grid",
    placeItems: "center",
  });
  d.textContent = text;
  return d;
}

/** A name on the map, in capitals with a halo, as the camera screen writes. */
export function label(
  text: string,
  color: string,
  halo: string,
  size = 11,
): HTMLDivElement {
  const d = document.createElement("div");
  Object.assign(d.style, {
    color,
    font: `700 ${size}px/1.2 var(--semi, sans-serif)`,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    whiteSpace: "nowrap",
    textShadow: `0 0 2px ${halo}, 0 0 2px ${halo}, 0 0 3px ${halo}`,
    pointerEvents: "none",
  });
  d.textContent = text;
  return d;
}

export type Pin = {
  at: LngLat;
  el: HTMLElement;
  /** Where the element hangs from its point. Default: its middle. */
  anchor?: "center" | "bottom" | "left" | "top";
  /** Pixels to move the element by after anchoring. */
  offset?: [number, number];
  z?: number;
  /** Takes taps and clicks: the map does not see them. */
  hit?: boolean;
};

/**
 * HTML on the map: one layer of pins, each an element at a point. Built only
 * after the script has loaded, since OverlayView comes with it.
 */
export function htmlLayer(m: google.maps.Map) {
  const box = document.createElement("div");
  box.style.position = "absolute";
  let pins: Pin[] = [];
  const watchers = new Set<() => void>();

  class Layer extends google.maps.OverlayView {
    override onAdd() {
      this.getPanes()?.overlayMouseTarget.append(box);
    }
    override onRemove() {
      box.remove();
    }
    override draw() {
      const p = this.getProjection();
      if (!p) return;
      for (const pin of pins) {
        const at = p.fromLatLngToDivPixel(toLatLng(pin.at));
        if (!at) continue;
        const [dx, dy] = pin.offset ?? [0, 0];
        const tx =
          pin.anchor === "left" ? "0" : pin.anchor === "top" ? "-50%" : "-50%";
        const ty =
          pin.anchor === "bottom"
            ? "-100%"
            : pin.anchor === "top"
              ? "0"
              : "-50%";
        pin.el.style.transform = `translate(${at.x + dx}px, ${at.y + dy}px) translate(${tx}, ${ty})`;
      }
      for (const w of watchers) w();
    }
  }
  const layer = new Layer();
  layer.setMap(m);

  return {
    /** Puts these pins on the map in place of the ones before. */
    set(next: Pin[]) {
      box.replaceChildren();
      pins = next;
      for (const pin of pins) {
        Object.assign(pin.el.style, {
          position: "absolute",
          left: "0",
          top: "0",
          zIndex: String(pin.z ?? 0),
        });
        if (pin.hit) {
          google.maps.OverlayView.preventMapHitsAndGesturesFrom(pin.el);
        } else {
          pin.el.style.pointerEvents = "none";
        }
        box.append(pin.el);
      }
      layer.draw();
    },
    /** A point on the map as pixels in the map's box. */
    toPixel(at: LngLat): { x: number; y: number } | null {
      const p = layer.getProjection()?.fromLatLngToContainerPixel(toLatLng(at));
      return p ? { x: p.x, y: p.y } : null;
    },
    /** Pixels in the map's box as a point on the map. */
    toLngLat(x: number, y: number): LngLat | null {
      const p = layer
        .getProjection()
        ?.fromContainerPixelToLatLng(new google.maps.Point(x, y));
      return p ? [p.lng(), p.lat()] : null;
    },
    /** Called after each redraw, as the map moves. Returns what stops it. */
    watch(f: () => void) {
      watchers.add(f);
      return () => watchers.delete(f);
    },
    remove() {
      layer.setMap(null);
    },
  };
}
export type HtmlLayer = ReturnType<typeof htmlLayer>;

/** A line, with an optional dash and a soft wider line under it for glow. */
export function polyline(
  m: google.maps.Map,
  o: {
    color: string;
    width: number;
    opacity?: number;
    dash?: [number, number];
    z?: number;
    clickable?: boolean;
  },
) {
  const opacity = o.opacity ?? 1;
  return new google.maps.Polyline({
    map: m,
    strokeColor: o.color,
    strokeWeight: o.dash ? 0 : o.width,
    strokeOpacity: o.dash ? 0 : opacity,
    zIndex: o.z ?? 0,
    clickable: o.clickable ?? false,
    icons: o.dash
      ? [
          {
            icon: {
              path: "M 0,-1 0,1",
              strokeColor: o.color,
              strokeOpacity: opacity,
              strokeWeight: o.width,
              scale: o.dash[0],
            },
            offset: "0",
            repeat: `${o.dash[0] * 2 + o.dash[1]}px`,
          },
        ]
      : [],
  });
}

/** Distance in pixels from p to the segment a–b. */
export function toSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t = len
    ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len))
    : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
