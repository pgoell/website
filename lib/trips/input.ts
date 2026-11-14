/**
 * Checks what the editing view sends to the server. Types do not survive the
 * wire, so every value is looked at here before it reaches the database.
 * Pure; relative imports only.
 */

import type { PlaceRow } from "./edit";
import { MOST_DRAWN, MOST_POINTS } from "./route";
import type { DrawnPoint, LngLat } from "./types";

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isSlug = (v: unknown): v is string =>
  typeof v === "string" && v.length <= 100 && SLUG.test(v);
export const isId = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v > 0;
export const isDate = (v: unknown): v is string =>
  typeof v === "string" && DATE.test(v);
export const isText = (v: unknown, most: number): v is string =>
  typeof v === "string" && v.length <= most;

/** At most this many places in one day's order. */
const MOST_IN_DAY = 500;
export const isIds = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length <= MOST_IN_DAY && v.every(isId);

/** Google's ID of a place, or "none". */
export const isGoogleId = (v: unknown): v is string | null =>
  v === null || (typeof v === "string" && /^[\w-]{1,300}$/.test(v));

/** A web link, http or https, or nothing. */
export function webUrl(v: unknown): string | null | undefined {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "string" || v.length > 2000) return undefined;
  const url = v.trim();
  if (!url) return null;
  if (!URL.canParse(url) || !/^https?:$/.test(new URL(url).protocol))
    return undefined;
  return url;
}

const text = (v: unknown, most: number): string | null | undefined => {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string" || v.length > most) return undefined;
  return v.trim() || null;
};

const coord = (v: unknown, most: number): number | null =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= most ? v : null;

/**
 * A place from the form, ready for the database, or why it is not: "noName"
 * or "badLink" the person can fix, "badInput" for anything else.
 */
export function placeRow(
  raw: unknown,
): PlaceRow | "noName" | "badLink" | "badInput" {
  if (!raw || typeof raw !== "object") return "badInput";
  const v = raw as Record<string, unknown>;
  if (!isText(v.name, 300)) return "badInput";
  const name = v.name.trim();
  if (!name) return "noName";
  const url = webUrl(v.url);
  if (url === undefined) return "badLink";
  const note = text(v.note, 5000);
  const tags = text(v.tags, 500);
  const day = v.day === null || v.day === undefined ? null : v.day;
  if (note === undefined || tags === undefined) return "badInput";
  if (day !== null && !isDate(day)) return "badInput";
  if (v.status !== "idea" && v.status !== "confirmed") return "badInput";
  const lat = coord(v.lat, 90);
  const lng = coord(v.lng, 180);
  return {
    name,
    url,
    note,
    tags,
    day,
    // A pin needs both.
    lat: lng === null ? null : lat,
    lng: lat === null ? null : lng,
    status: v.status,
  };
}

const spot = (p: unknown): p is LngLat =>
  Array.isArray(p) &&
  p.length === 2 &&
  p.every((n) => typeof n === "number" && Number.isFinite(n)) &&
  Math.abs(p[0]) <= 180 &&
  Math.abs(p[1]) <= 90;

/** The points of a drawn line, kept to what a point holds, or null. */
export function drawnPoints(raw: unknown): DrawnPoint[] | null {
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > MOST_POINTS)
    return null;
  const out: DrawnPoint[] = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") return null;
    const { at, road, line } = p as Record<string, unknown>;
    if (typeof road !== "boolean" || !spot(at)) return null;
    if (
      line !== undefined &&
      !(Array.isArray(line) && line.length <= MOST_DRAWN && line.every(spot))
    )
      return null;
    out.push(
      !road && Array.isArray(line) && line.length
        ? { at, road, line: line as LngLat[] }
        : { at, road },
    );
  }
  return out;
}
