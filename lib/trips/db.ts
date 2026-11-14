/**
 * The website's connection to its own Postgres database (`DATABASE_URL`), and
 * the trips as the pages read them. Server only.
 */

import postgres, { type Sql } from "postgres";
import { migrate } from "./schema";
import { type ShownCard, shownCard, shownTrip } from "./shown";
import { listTrips, loadTrip, type TripHead } from "./store";
import type { StoredTrip, Trip } from "./types";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

let ready: Promise<Sql> | undefined;

/** The connection, with the schema brought up to date on first use. */
export function db(): Promise<Sql> {
  if (!ready) {
    const url = process.env.DATABASE_URL;
    if (!url) return Promise.reject(new Error("DATABASE_URL is not set"));
    const sql = postgres(url, { max: 5, onnotice: () => {} });
    ready = migrate(sql).then(
      () => sql,
      (err) => {
        ready = undefined;
        throw err;
      },
    );
  }
  return ready;
}

/** A read that fails quietly, like the feed it replaces: a page without trips beats no page. */
async function read<T>(
  what: string,
  fallback: T,
  run: (sql: Sql) => Promise<T>,
): Promise<T> {
  // `next build` prerenders without a database.
  if (!process.env.DATABASE_URL) return fallback;
  try {
    return await run(await db());
  } catch (err) {
    console.error(`Trips: reading ${what} failed:`, err);
    return fallback;
  }
}

/** Every trip with its `public` flag, newest first. Only for someone signed in. */
export const allTrips = (): Promise<TripHead[]> =>
  read("the trips", [], (sql) => listTrips(sql));

/**
 * The open trips, newest first, as a visitor sees them. Filtered in the
 * query, so a private trip never leaves the database for a visitor.
 */
export async function getTrips(): Promise<ShownCard[]> {
  return (await read("the open trips", [], (sql) => listTrips(sql, true))).map(
    shownCard,
  );
}

/** A trip whole, open or private. Only for someone signed in. */
export async function getStoredTrip(slug: string): Promise<StoredTrip | null> {
  if (!SLUG.test(slug)) return null;
  return (
    (await read(`trip ${slug}`, undefined, (sql) => loadTrip(sql, slug))) ??
    null
  );
}

/** One open trip as a visitor sees it, or null when it is private or unknown. */
export async function getTrip(slug: string): Promise<Trip | null> {
  if (!SLUG.test(slug)) return null;
  const trip = await read(`trip ${slug}`, undefined, (sql) =>
    loadTrip(sql, slug, true),
  );
  return trip ? shownTrip(trip) : null;
}
