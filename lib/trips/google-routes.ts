import type { LngLat } from "./types";

/** A Google encoded polyline as [lng, lat] points. */
export function decodePolyline(encoded: string): LngLat[] {
  const out: LngLat[] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  const next = () => {
    let shift = 0;
    let result = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < encoded.length) {
    lat += next();
    lng += next();
    out.push([lng / 1e5, lat / 1e5]);
  }
  return out;
}

/** "1234s" or "12.5s" as seconds. */
export const seconds = (d: string | undefined) =>
  d ? Number.parseFloat(d) || 0 : 0;

const at = ([lng, lat]: LngLat) => ({
  location: { latLng: { latitude: lat, longitude: lng } },
});

/** The body of a Routes API computeRoutes request, by car through every point. */
export function routesRequest(through: LngLat[]) {
  return {
    origin: at(through[0] as LngLat),
    destination: at(through.at(-1) as LngLat),
    intermediates: through.slice(1, -1).map(at),
    travelMode: "DRIVE",
    polylineQuality: "HIGH_QUALITY",
    languageCode: "en",
    units: "METRIC",
  };
}

export type RoutesAnswer = {
  routes?: {
    legs?: {
      distanceMeters?: number;
      duration?: string;
      polyline?: { encodedPolyline?: string };
    }[];
  }[];
  error?: { code: number; status: string; message: string };
};

export const ROUTES_URL =
  "https://routes.googleapis.com/directions/v2:computeRoutes";
export const ROUTES_FIELDS =
  "routes.legs.distanceMeters,routes.legs.duration,routes.legs.polyline.encodedPolyline";
