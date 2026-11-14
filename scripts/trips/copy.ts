/**
 * Cutover: copies the trips app's SQLite database into the trips schema of
 * the Postgres database in DATABASE_URL, then prints the row count of every
 * table on both sides. Refuses when the trips tables already hold rows.
 * Reads a snapshot made by snapshot.py, never the live file. Run with Bun,
 * in the website image:
 *
 *   python3 -I scripts/trips/snapshot.py ~/.local/share/trips/trips.db /tmp/trips-cutover/trips.db
 *   docker run --rm --network web --env-file ~/.config/website/db-dev.env \
 *     -v /tmp/trips-cutover:/data:ro ghcr.io/pgoell/website:<tag> \
 *     bun scripts/trips/copy.ts /data/trips.db
 */

import { Database } from "bun:sqlite";
import postgres from "postgres";
import { copyRows, countRows, type Rows, TABLES } from "../../lib/trips/copy";
import { migrate } from "../../lib/trips/schema";

const file = process.argv[2];
const url = process.env.DATABASE_URL;
if (!file || !url) {
  console.error("usage: DATABASE_URL=... bun scripts/trips/copy.ts <trips.db>");
  process.exit(2);
}

// Read-only: the snapshot stays as it was.
const lite = new Database(file, { readonly: true });
const rows = {} as Rows;
for (const table of TABLES) {
  rows[table] = lite
    .query(`SELECT * FROM ${table}`)
    .all() as Rows[typeof table];
}
lite.close();

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await migrate(sql);
  await copyRows(sql, rows);
  const after = await countRows(sql);
  let same = true;
  console.log("table      sqlite  postgres");
  for (const table of TABLES) {
    const a = rows[table].length;
    const b = after[table];
    if (a !== b) same = false;
    console.log(
      `${table.padEnd(10)} ${String(a).padStart(6)}  ${String(b).padStart(8)}${a === b ? "" : "  MISMATCH"}`,
    );
  }
  if (!same) process.exitCode = 1;
} finally {
  await sql.end();
}
