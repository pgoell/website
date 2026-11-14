/**
 * Booking import: reads one trip as JSON on stdin (the TripImport shape in
 * lib/trips/types.ts, kept with the vault, never in this repo) and replaces
 * the trip's dates, stops, bookings and legs in DATABASE_URL. Places, ideas,
 * drawn lines and day notes stay. Run with Bun in the running container:
 *
 *   docker exec -i website-prod bun scripts/trips/import.ts < japan.json
 */

import postgres from "postgres";
import { importProblems, importTrip } from "../../lib/trips/import";
import { migrate } from "../../lib/trips/schema";
import type { TripImport } from "../../lib/trips/types";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(2);
}

const raw: unknown = JSON.parse(await Bun.stdin.text());
const problems = importProblems(raw);
if (problems.length) {
  console.error(`not imported, check: ${problems.join(", ")}`);
  process.exit(1);
}
const trip = raw as TripImport;

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await migrate(sql);
  await importTrip(sql, trip);
  console.log(
    `${trip.slug}: ${trip.stops.length} stops, ${trip.bookings.length} bookings, ${trip.legs.length} legs`,
  );
} finally {
  await sql.end();
}
