/**
 * The booking import: replaces everything a trip file from the vault owns
 * (the trip's dates, stops, bookings and legs). Places, ideas, drawn lines
 * and day notes stay. JSON goes as plain values, written for the column's
 * own type, so the json column keeps a booking's detail in its key order.
 * Relative imports only, like `schema.ts`.
 */

import type { Sql } from "postgres";
import type { TripImport } from "./types";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The file's problems, or none. Checks the shape, not the facts. */
export function importProblems(raw: unknown): string[] {
  const t = raw as Partial<TripImport> | null;
  const problems: string[] = [];
  if (!t || typeof t !== "object") return ["not a JSON object"];
  if (typeof t.slug !== "string" || !SLUG.test(t.slug)) problems.push("slug");
  if (typeof t.name !== "string" || !t.name) problems.push("name");
  if (typeof t.startDate !== "string" || !DATE.test(t.startDate))
    problems.push("startDate");
  if (typeof t.endDate !== "string" || !DATE.test(t.endDate))
    problems.push("endDate");
  if (typeof t.public !== "boolean") problems.push("public");
  for (const key of ["stops", "bookings", "legs"] as const) {
    if (!Array.isArray(t[key])) problems.push(key);
  }
  if (Array.isArray(t.stops) && t.stops.length === 0) problems.push("no stops");
  return problems;
}

export async function importTrip(sql: Sql, t: TripImport): Promise<number> {
  return sql.begin(async (tx) => {
    const [{ id }] = (await tx<{ id: number }[]>`
      INSERT INTO trips.trip (slug, name, start_date, end_date, public)
      VALUES (${t.slug}, ${t.name}, ${t.startDate}, ${t.endDate}, ${t.public})
      ON CONFLICT (slug) DO UPDATE SET name = excluded.name,
        start_date = excluded.start_date, end_date = excluded.end_date,
        public = excluded.public
      RETURNING id`) as unknown as [{ id: number }];

    await tx`DELETE FROM trips.stop WHERE trip_id = ${id}`;
    await tx`DELETE FROM trips.booking WHERE trip_id = ${id}`;
    // A route added in the app is not the trip file's to replace.
    await tx`DELETE FROM trips.leg WHERE trip_id = ${id} AND NOT own`;
    for (const [i, s] of t.stops.entries()) {
      await tx`
        INSERT INTO trips.stop (trip_id, position, name, tz, lat, lng, arrive, depart)
        VALUES (${id}, ${i + 1}, ${s.name}, ${s.tz}, ${s.lat}, ${s.lng}, ${s.arrive}, ${s.depart})`;
    }
    for (const b of t.bookings) {
      await tx`
        INSERT INTO trips.booking (trip_id, stop_position, kind, title, start_at, start_tz,
          end_at, end_tz, confirmation, detail)
        VALUES (${id}, ${b.stopPosition}, ${b.kind}, ${b.title}, ${b.startAt}, ${b.startTz},
          ${b.endAt}, ${b.endTz}, ${b.confirmation}, ${b.detail as never})`;
    }
    for (const l of t.legs) {
      await tx`
        INSERT INTO trips.leg (trip_id, mode, title, how, leave_date, leave, leave_tz,
          arrive_date, arrive, arrive_tz, cost, note, path)
        VALUES (${id}, ${l.mode}, ${l.title}, ${l.how}, ${l.leaveDate}, ${l.leave}, ${l.leaveTz},
          ${l.arriveDate}, ${l.arrive}, ${l.arriveTz}, ${l.cost}, ${l.note}, ${l.path as never})`;
    }
    for (const [date, note] of Object.entries(t.dayNotes ?? {})) {
      await tx`
        INSERT INTO trips.day_note (trip_id, date, note) VALUES (${id}, ${date}, ${note})
        ON CONFLICT DO NOTHING`;
    }
    return id;
  });
}
