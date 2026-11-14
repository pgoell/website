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
} from "@/lib/trips/input";
import { roadsThrough } from "@/lib/trips/road";
import { missingRuns, pathOf, type Road, roadKey } from "@/lib/trips/route";
import type { LngLat } from "@/lib/trips/types";
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
  | "noRoad";
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
    await edit.updatePlace(r.sql, r.tripId, id, row);
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
  await edit.orderDay(r.sql, r.tripId, date, ids);
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
  await edit.setGooglePlaceId(r.sql, r.tripId, id, googlePlaceId);
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
  changed(r.slug);
}
