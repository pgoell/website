/**
 * Changes to a trip by someone signed in: places and ideas, a day's order and
 * note, a ground leg's drawn line, and routes added to a day. Takes the connection as an argument,
 * like `store.ts`; the caller checks the session and the input. JSON goes as
 * plain values, written for the column's own type. Relative imports only.
 */

import type { Sql } from "postgres";
import type { DrawnPoint, LngLat, PlaceStatus } from "./types";

export type PlaceRow = {
  name: string;
  url: string | null;
  note: string | null;
  tags: string | null;
  day: string | null;
  lat: number | null;
  lng: number | null;
  status: PlaceStatus;
};

/** The id of the trip with this slug. */
export async function tripIdOf(
  sql: Sql,
  slug: string,
): Promise<number | undefined> {
  const [row] = await sql<{ id: number }[]>`
    SELECT id FROM trips.trip WHERE slug = ${slug}`;
  return row?.id;
}

export async function insertPlace(
  sql: Sql,
  tripId: number,
  row: PlaceRow,
  createdBy: string,
): Promise<number> {
  const [made] = await sql<{ id: number }[]>`
    INSERT INTO trips.place (trip_id, name, url, note, tags, day, lat, lng, status, created_by)
    VALUES (${tripId}, ${row.name}, ${row.url}, ${row.note}, ${row.tags}, ${row.day},
      ${row.lat}, ${row.lng}, ${row.status}, ${createdBy})
    RETURNING id`;
  return (made as { id: number }).id;
}

/** False when the trip has no such place. */
export async function updatePlace(
  sql: Sql,
  tripId: number,
  id: number,
  row: PlaceRow,
): Promise<boolean> {
  // Moved to another day, the place joins the end of that day's route.
  const done = await sql`
    UPDATE trips.place SET name = ${row.name}, url = ${row.url}, note = ${row.note},
      tags = ${row.tags},
      day_order = CASE WHEN day IS NOT DISTINCT FROM ${row.day}::text THEN day_order END,
      day = ${row.day}, lat = ${row.lat}, lng = ${row.lng}, status = ${row.status}
    WHERE id = ${id} AND trip_id = ${tripId}`;
  return done.count > 0;
}

export async function deletePlace(
  sql: Sql,
  tripId: number,
  id: number,
): Promise<void> {
  await sql`DELETE FROM trips.place WHERE id = ${id} AND trip_id = ${tripId}`;
}

/**
 * The order of a day's places: its route. False when a place is no longer
 * on that day; nothing changes then.
 */
export async function orderDay(
  sql: Sql,
  tripId: number,
  date: string,
  ids: number[],
): Promise<boolean> {
  return sql
    .begin(async (tx) => {
      for (const [n, id] of ids.entries()) {
        const done = await tx`
          UPDATE trips.place SET day_order = ${n}
          WHERE id = ${id} AND trip_id = ${tripId} AND day = ${date}`;
        if (done.count === 0) throw new Gone();
      }
      return true;
    })
    .catch((err) => {
      if (err instanceof Gone) return false;
      throw err;
    });
}

class Gone extends Error {}

export async function saveDayNote(
  sql: Sql,
  tripId: number,
  date: string,
  note: string,
): Promise<void> {
  await sql`
    INSERT INTO trips.day_note (trip_id, date, note) VALUES (${tripId}, ${date}, ${note})
    ON CONFLICT (trip_id, date) DO UPDATE SET note = excluded.note`;
}

/**
 * The one thing kept from Google: the ID of its entry for our place.
 * "none" says Google has no entry, or the wrong one, so do not look again.
 */
export async function setGooglePlaceId(
  sql: Sql,
  tripId: number,
  id: number,
  googlePlaceId: string | null,
): Promise<boolean> {
  const done = await sql`
    UPDATE trips.place SET google_place_id = ${googlePlaceId}
    WHERE id = ${id} AND trip_id = ${tripId}`;
  return done.count > 0;
}

/** The trip has a ground leg that leaves on this day under this title. */
export async function hasGroundLeg(
  sql: Sql,
  tripId: number,
  leaveDate: string,
  title: string,
): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM trips.leg WHERE trip_id = ${tripId} AND leave_date = ${leaveDate}
      AND title = ${title} AND mode = 'ground'`;
  return rows.length > 0;
}

/** A ground leg's line as drawn, standing in for the imported one. */
export async function saveLegPath(
  sql: Sql,
  tripId: number,
  leaveDate: string,
  title: string,
  path: LngLat[],
  points: DrawnPoint[],
): Promise<void> {
  await sql`
    INSERT INTO trips.leg_path (trip_id, leave_date, title, path, points)
    VALUES (${tripId}, ${leaveDate}, ${title}, ${path as never}, ${points as never})
    ON CONFLICT (trip_id, leave_date, title)
      DO UPDATE SET path = excluded.path, points = excluded.points`;
}

/** Back to the line the trip came with. */
export async function deleteLegPath(
  sql: Sql,
  tripId: number,
  leaveDate: string,
  title: string,
): Promise<void> {
  await sql`
    DELETE FROM trips.leg_path
    WHERE trip_id = ${tripId} AND leave_date = ${leaveDate} AND title = ${title}`;
}

/** The stop a day is spent at, the first one if it has two. */
export async function stopOn(
  sql: Sql,
  tripId: number,
  date: string,
): Promise<{ tz: string; at: LngLat } | undefined> {
  const [row] = await sql<{ tz: string; lat: number; lng: number }[]>`
    SELECT tz, lat, lng FROM trips.stop
    WHERE trip_id = ${tripId} AND arrive <= ${date} AND ${date} <= depart
    ORDER BY position LIMIT 1`;
  return row && { tz: row.tz, at: [row.lng, row.lat] };
}

/**
 * A route added in the app: a ground leg without times, in the zone of the
 * day's stop. False when the day already has a leg under this title, since a
 * drawn line hangs on date and title.
 */
export async function insertOwnLeg(
  sql: Sql,
  tripId: number,
  date: string,
  title: string,
  tz: string,
  path: LngLat[],
): Promise<boolean> {
  return sql.begin(async (tx) => {
    // One at a time per trip, so two taps cannot add the same title twice.
    await tx`SELECT 1 FROM trips.trip WHERE id = ${tripId} FOR UPDATE`;
    const taken = await tx`
      SELECT 1 FROM trips.leg
      WHERE trip_id = ${tripId} AND leave_date = ${date} AND title = ${title}`;
    if (taken.length) return false;
    // A line drawn for a leg of this name that an import has since dropped.
    await tx`
      DELETE FROM trips.leg_path
      WHERE trip_id = ${tripId} AND leave_date = ${date} AND title = ${title}`;
    await tx`
      INSERT INTO trips.leg (trip_id, mode, title, how, leave_date, leave, leave_tz,
        arrive_date, arrive, arrive_tz, path, own)
      VALUES (${tripId}, 'ground', ${title}, '', ${date}, '', ${tz},
        ${date}, '', ${tz}, ${path as never}, true)`;
    return true;
  });
}

/** Removes a route added in the app, with its drawn line. One the trip came with stays. */
export async function deleteOwnLeg(
  sql: Sql,
  tripId: number,
  id: number,
): Promise<void> {
  await sql.begin(async (tx) => {
    const [leg] = await tx<{ leaveDate: string; title: string }[]>`
      DELETE FROM trips.leg WHERE id = ${id} AND trip_id = ${tripId} AND own
      RETURNING leave_date AS "leaveDate", title`;
    if (!leg) return;
    await tx`
      DELETE FROM trips.leg_path WHERE trip_id = ${tripId}
        AND leave_date = ${leg.leaveDate} AND title = ${leg.title}`;
  });
}
