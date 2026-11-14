"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Sql } from "postgres";
import { locales } from "@/i18n/config";
import { readSession, SESSION_COOKIE, type User } from "@/lib/trips/auth";
import { db } from "@/lib/trips/db";
import * as edit from "@/lib/trips/edit";
import {
  drawnPoints,
  isDate,
  isGoogleId,
  isId,
  isIds,
  isSlug,
  isText,
  placeRow,
  spot,
} from "@/lib/trips/input";
import { roadsThrough } from "@/lib/trips/road";
import { missingRuns, pathOf, type Road, roadKey } from "@/lib/trips/route";
import type { DrawnPoint, LngLat } from "@/lib/trips/types";
import { fillFromLink } from "@/lib/trips/unfurl";

/*
 * What someone signed in may change on a trip. Every action reads the session
 * cookie itself; the hint cookie proves nothing. A production build hides the
 * message of an error thrown here, so a failure the person can act on comes
 * back as a code the page turns into words. Only the unexpected is thrown.
 */

export type TripError =
  | "signedOut"
  | "badInput"
  | "noTrip"
  | "noName"
  | "badLink"
  | "badRoute"
  | "roadsDown"
  | "noRoad"
  | "noPlace"
  | "noRouteName"
  | "routeNameTaken"
  | "noStop";
export type Failed = { error: TripError } | undefined;

type Ready = { sql: Sql; tripId: number; slug: string; user: User };

/** The session, the trip and the connection, or why not. */
async function begin(slug: unknown): Promise<Ready | { error: TripError }> {
  const user = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) return { error: "signedOut" };
  if (!isSlug(slug)) return { error: "badInput" };
  const sql = await db();
  const tripId = await edit.tripIdOf(sql, slug);
  if (!tripId) return { error: "noTrip" };
  return { sql, tripId, slug, user };
}

function changed(slug: string) {
  for (const locale of locales) revalidatePath(`/${locale}/trips/${slug}`);
}

/** Adds a place or an idea, or changes one. A new one with a link is filled from the page behind it. */
export async function savePlace(slug: string, input: unknown): Promise<Failed> {
  const r = await begin(slug);
  if ("error" in r) return r;
  const row = placeRow(input);
  if (typeof row === "string") return { error: row };
  const id = (input as { id?: unknown }).id;
  if (id !== undefined && id !== null) {
    if (!isId(id)) return { error: "badInput" };
    // Deleted by someone else since the page loaded.
    if (!(await edit.updatePlace(r.sql, r.tripId, id, row)))
      return { error: "noPlace" };
  } else {
    await edit.insertPlace(
      r.sql,
      r.tripId,
      await fillFromLink(row),
      r.user.name,
    );
  }
  changed(r.slug);
}

export async function deletePlace(slug: string, id: unknown): Promise<Failed> {
  const r = await begin(slug);
  if ("error" in r) return r;
  if (!isId(id)) return { error: "badInput" };
  await edit.deletePlace(r.sql, r.tripId, id);
  changed(r.slug);
}

/** The order of a day's places: its route. */
export async function orderDay(
  slug: string,
  date: unknown,
  ids: unknown,
): Promise<Failed> {
  const r = await begin(slug);
  if ("error" in r) return r;
  if (!isDate(date) || !isIds(ids)) return { error: "badInput" };
  if (!(await edit.orderDay(r.sql, r.tripId, date, ids)))
    return { error: "noPlace" };
  changed(r.slug);
}

export async function saveDayNote(
  slug: string,
  date: unknown,
  note: unknown,
): Promise<Failed> {
  const r = await begin(slug);
  if ("error" in r) return r;
  if (!isDate(date) || !isText(note, 5000)) return { error: "badInput" };
  await edit.saveDayNote(r.sql, r.tripId, date, note.trim());
  changed(r.slug);
}

/** Google's ID for a place, or "none" when Google has none or the wrong one. */
export async function setGooglePlaceId(
  slug: string,
  id: unknown,
  googlePlaceId: unknown,
): Promise<Failed> {
  const r = await begin(slug);
  if ("error" in r) return r;
  if (!isId(id) || !isGoogleId(googlePlaceId)) return { error: "badInput" };
  if (!(await edit.setGooglePlaceId(r.sql, r.tripId, id, googlePlaceId)))
    return { error: "noPlace" };
  changed(r.slug);
}

/**
 * A ground leg's line as drawn on the map: through the given points, each
 * stretch along the road, straight (a boat) or as drawn by hand (a track the
 * map lacks). No points: back to the line from the trip file.
 */
export async function drawLeg(
  slug: string,
  leaveDate: unknown,
  title: unknown,
  points: unknown,
): Promise<Failed> {
  const r = await begin(slug);
  if ("error" in r) return r;
  if (!isDate(leaveDate) || !isText(title, 500)) return { error: "badInput" };
  if (Array.isArray(points) && points.length === 0) {
    await edit.deleteLegPath(r.sql, r.tripId, leaveDate, title);
    changed(r.slug);
    return;
  }
  const drawn = drawnPoints(points);
  if (!drawn || !(await edit.hasGroundLeg(r.sql, r.tripId, leaveDate, title)))
    return { error: "badRoute" };
  const failed = await storeLine(r, leaveDate, title, drawn);
  if (failed) return failed;
  changed(r.slug);
}

/** Looks up the roads of a ground leg's line and keeps the line. */
async function storeLine(
  r: Ready,
  leaveDate: string,
  title: string,
  drawn: DrawnPoint[],
): Promise<Failed> {
  // The roads the editor showed are kept, so most of this asks nobody.
  const roads = new Map<string, Road | null>();
  try {
    for (const run of missingRuns(drawn, roads)) {
      (await roadsThrough(run)).forEach((road, i) => {
        roads.set(roadKey(run[i] as LngLat, run[i + 1] as LngLat), road);
      });
    }
  } catch {
    return { error: "roadsDown" };
  }
  const path = pathOf(drawn, roads);
  if (!path) return { error: "noRoad" };
  await edit.saveLegPath(r.sql, r.tripId, leaveDate, title, path, drawn);
}

/**
 * A route of one's own for a day: from the day's stop to a spot tapped on the
 * map, and back if asked. It opens in the editor like any other.
 */
export async function addLeg(
  slug: string,
  date: unknown,
  name: unknown,
  to: unknown,
  back: unknown,
): Promise<Failed> {
  const r = await begin(slug);
  if ("error" in r) return r;
  if (
    !isDate(date) ||
    !isText(name, 80) ||
    !spot(to) ||
    typeof back !== "boolean"
  )
    return { error: "badInput" };
  const title = name.trim();
  if (!title) return { error: "noRouteName" };
  const stop = await edit.stopOn(r.sql, r.tripId, date);
  if (!stop) return { error: "noStop" };
  const points: DrawnPoint[] = [
    { at: stop.at, road: false },
    { at: to, road: true },
    ...(back ? [{ at: stop.at, road: true }] : []),
  ];
  const made = await edit.insertOwnLeg(
    r.sql,
    r.tripId,
    date,
    title,
    stop.tz,
    points.map((p) => p.at),
  );
  if (!made) return { error: "routeNameTaken" };
  // Without a road the route is a straight line, to be bent in the editor.
  if (await storeLine(r, date, title, points)) {
    await storeLine(
      r,
      date,
      title,
      points.map((p) => ({ ...p, road: false })),
    );
  }
  changed(r.slug);
}

/** Removes a route added in the app. One the trip came with stays. */
export async function removeLeg(slug: string, id: unknown): Promise<Failed> {
  const r = await begin(slug);
  if ("error" in r) return r;
  if (!isId(id)) return { error: "badInput" };
  await edit.deleteOwnLeg(r.sql, r.tripId, id);
  changed(r.slug);
}
