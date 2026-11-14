/**
 * Reads trips out of Postgres. Takes the connection as an argument, so the
 * tests and the scripts in `scripts/trips/` can hand in their own. Relative
 * imports only, like `schema.ts`.
 */

import type { Sql } from "postgres";
import type {
  Booking,
  StoredLeg,
  StoredPlace,
  StoredStop,
  StoredTrip,
} from "./types";

export type TripHead = Pick<
  StoredTrip,
  "slug" | "name" | "startDate" | "endDate" | "public"
> & {
  /** The stops' names in order. */
  stops: string[];
};

/** Every trip, or only the open ones, newest first. */
export async function listTrips(
  sql: Sql,
  openOnly = false,
): Promise<TripHead[]> {
  return sql<TripHead[]>`
    SELECT slug, name, start_date AS "startDate", end_date AS "endDate", public,
      coalesce((SELECT array_agg(s.name ORDER BY s.position)
                FROM trips.stop s WHERE s.trip_id = t.id), '{}') AS stops
    FROM trips.trip t WHERE public OR NOT ${openOnly}::boolean
    ORDER BY start_date DESC`;
}

/** The newest trip: where a shared link lands. */
export async function latestTripSlug(sql: Sql): Promise<string | undefined> {
  const [row] = await sql<{ slug: string }[]>`
    SELECT slug FROM trips.trip ORDER BY start_date DESC LIMIT 1`;
  return row?.slug;
}

/** A trip whole; with `openOnly`, nothing when it is private. */
export async function loadTrip(
  sql: Sql,
  slug: string,
  openOnly = false,
): Promise<StoredTrip | undefined> {
  const [trip] = await sql<
    Omit<StoredTrip, "stops" | "bookings" | "legs" | "places" | "dayNotes">[]
  >`
    SELECT id, slug, name, start_date AS "startDate", end_date AS "endDate", public
    FROM trips.trip WHERE slug = ${slug} AND (public OR NOT ${openOnly}::boolean)`;
  if (!trip) return undefined;
  const id = trip.id;

  const [stops, bookings, legs, places, notes] = await Promise.all([
    sql<StoredStop[]>`
      SELECT id, position, name, tz, lat, lng, arrive, depart
      FROM trips.stop WHERE trip_id = ${id} ORDER BY position`,
    sql<Booking[]>`
      SELECT id, stop_position AS "stopPosition", kind, title, start_at AS "startAt",
        start_tz AS "startTz", end_at AS "endAt", end_tz AS "endTz", confirmation, detail
      FROM trips.booking WHERE trip_id = ${id} ORDER BY start_at, id`,
    // A line drawn in the app wins. It hangs on date and title, since an
    // import gives every leg a new id.
    sql<StoredLeg[]>`
      SELECT leg.id, mode, leg.title, how, leg.leave_date AS "leaveDate", leave,
        leave_tz AS "leaveTz", arrive_date AS "arriveDate", arrive,
        arrive_tz AS "arriveTz", cost, note, leg.own,
        coalesce(d.path, leg.path) AS path, d.path IS NOT NULL AS drawn, d.points
      FROM trips.leg LEFT JOIN trips.leg_path d ON d.trip_id = leg.trip_id
        AND d.leave_date = leg.leave_date AND d.title = leg.title
      WHERE leg.trip_id = ${id} ORDER BY leg.id`,
    sql<StoredPlace[]>`
      SELECT id, name, url, note, tags, day, day_order AS "dayOrder", lat, lng, status,
        google_place_id AS "googlePlaceId", created_by AS "createdBy"
      FROM trips.place WHERE trip_id = ${id} ORDER BY created_at DESC, id DESC`,
    sql<{ date: string; note: string }[]>`
      SELECT date, note FROM trips.day_note WHERE trip_id = ${id}`,
  ]);

  return {
    ...trip,
    stops: [...stops],
    bookings: [...bookings],
    legs: [...legs],
    places: [...places],
    dayNotes: Object.fromEntries(notes.map((n) => [n.date, n.note])),
  };
}
