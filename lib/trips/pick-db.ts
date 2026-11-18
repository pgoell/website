/**
 * Swipe in Postgres: the places Google found for a trip and everyone's votes.
 * Server only. Relative imports only, as in schema.ts.
 */

import type { Sql } from "postgres";
import {
  type Candidate,
  type FoundInput,
  type Kind,
  type PickState,
  peopleOf,
  SPOT_DAYS,
  type Vote,
} from "./pick";

type Me = { email: string; name: string };

/** Everything the swipe page needs, for one person. */
export async function loadPick(
  sql: Sql,
  tripId: number,
  me: Me,
  allowed: string | undefined,
): Promise<PickState> {
  const email = me.email.toLowerCase();
  // Coordinates older than Google lets us keep them go first.
  await sql`
    UPDATE trips.pick_place SET lat = NULL, lng = NULL, spot_at = NULL
    WHERE trip_id = ${tripId}
      AND spot_at < now() - make_interval(days => ${SPOT_DAYS})`;
  const rows = await sql<
    {
      id: string;
      kind: Kind;
      rank: number;
      lat: number | null;
      lng: number | null;
      added_at: Date;
    }[]
  >`
    SELECT google_place_id AS id, kind, rank, lat, lng, added_at
    FROM trips.pick_place WHERE trip_id = ${tripId}`;
  const candidates: Candidate[] = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    rank: r.rank,
    lat: r.lat,
    lng: r.lng,
    addedAt: r.added_at.toISOString(),
  }));

  const mine: Record<string, Vote> = {};
  for (const r of await sql<{ id: string; vote: Vote }[]>`
    SELECT google_place_id AS id, vote FROM trips.pick_vote
    WHERE trip_id = ${tripId} AND voter = ${email}`) {
    mine[r.id] = r.vote;
  }

  // Only where I have answered too: nobody sees the other answer first.
  const theirs: Record<string, Record<string, Vote>> = {};
  for (const r of await sql<{ id: string; voter: string; vote: Vote }[]>`
    SELECT v.google_place_id AS id, v.voter, v.vote
    FROM trips.pick_vote v
    JOIN trips.pick_vote m
      ON m.trip_id = v.trip_id AND m.google_place_id = v.google_place_id
     AND m.voter = ${email}
    WHERE v.trip_id = ${tripId} AND v.voter <> ${email}`) {
    theirs[r.id] ??= {};
    (theirs[r.id] as Record<string, Vote>)[r.voter] = r.vote;
  }

  const names: Record<string, string> = {};
  for (const r of await sql<{ voter: string; voter_name: string }[]>`
    SELECT DISTINCT ON (voter) voter, voter_name FROM trips.pick_vote
    WHERE trip_id = ${tripId} ORDER BY voter, at DESC`) {
    names[r.voter] = r.voter_name;
  }

  return { candidates, mine, theirs, people: peopleOf(allowed, me, names) };
}

/**
 * Keeps what a search found. A place found again moves to the top of the
 * deck with fresh coordinates; its votes stay.
 */
export async function addFound(
  sql: Sql,
  tripId: number,
  email: string,
  found: FoundInput[],
): Promise<void> {
  if (found.length === 0) return;
  const by = email.toLowerCase();
  await sql.begin(async (tx) => {
    for (const f of found) {
      await tx`
        INSERT INTO trips.pick_place
          (trip_id, google_place_id, kind, rank, lat, lng, spot_at, added_by)
        VALUES (${tripId}, ${f.id}, ${f.kind}, ${f.rank}, ${f.lat}, ${f.lng}, now(), ${by})
        ON CONFLICT (trip_id, google_place_id) DO UPDATE SET
          rank = excluded.rank, lat = excluded.lat, lng = excluded.lng,
          spot_at = now(), added_at = now()`;
    }
  });
}

/**
 * Sets my vote on a place and answers with the others' votes on it, or null
 * when the trip has no such place.
 */
export async function castVote(
  sql: Sql,
  tripId: number,
  me: Me,
  placeId: string,
  vote: Vote,
): Promise<Record<string, Vote> | null> {
  const email = me.email.toLowerCase();
  const [known] = await sql`
    SELECT 1 FROM trips.pick_place
    WHERE trip_id = ${tripId} AND google_place_id = ${placeId}`;
  if (!known) return null;
  await sql`
    INSERT INTO trips.pick_vote (trip_id, google_place_id, voter, voter_name, vote)
    VALUES (${tripId}, ${placeId}, ${email}, ${me.name}, ${vote})
    ON CONFLICT (trip_id, google_place_id, voter) DO UPDATE SET
      vote = excluded.vote, voter_name = excluded.voter_name, at = now()`;
  const theirs: Record<string, Vote> = {};
  for (const r of await sql<{ voter: string; vote: Vote }[]>`
    SELECT voter, vote FROM trips.pick_vote
    WHERE trip_id = ${tripId} AND google_place_id = ${placeId}
      AND voter <> ${email}`) {
    theirs[r.voter] = r.vote;
  }
  return theirs;
}

/** Takes my vote back. */
export async function takeBack(
  sql: Sql,
  tripId: number,
  email: string,
  placeId: string,
): Promise<void> {
  await sql`
    DELETE FROM trips.pick_vote
    WHERE trip_id = ${tripId} AND google_place_id = ${placeId}
      AND voter = ${email.toLowerCase()}`;
}

/** Fresh coordinates from Google for places we already keep. */
export async function saveSpots(
  sql: Sql,
  tripId: number,
  spots: { id: string; lat: number; lng: number }[],
): Promise<void> {
  if (spots.length === 0) return;
  await sql.begin(async (tx) => {
    for (const s of spots) {
      await tx`
        UPDATE trips.pick_place SET lat = ${s.lat}, lng = ${s.lng}, spot_at = now()
        WHERE trip_id = ${tripId} AND google_place_id = ${s.id}`;
    }
  });
}
