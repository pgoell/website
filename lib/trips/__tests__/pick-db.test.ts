import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { tripIdOf } from "../edit";
import { importTrip } from "../import";
import { addFound, castVote, loadPick, saveSpots, takeBack } from "../pick-db";
import { migrate } from "../schema";
import { loadTrip } from "../store";

// A throwaway database of its own, as in edit-db.test.ts. Never the shared one.
const url = process.env.TEST_DATABASE_URL;
const OWN = "trips_pick_test";

const ALLOWED = "pascal@x.de,alicia@x.de";
const pascal = { email: "pascal@x.de", name: "Pascal" };
const alicia = { email: "alicia@x.de", name: "Alicia" };
const spot = (id: string, rank = 0) => ({
  id,
  kind: "sight" as const,
  rank,
  lat: 35.71,
  lng: 139.79,
});

describe.skipIf(!url)("swipe in Postgres", () => {
  let sql: Sql;
  let trip: number;

  beforeAll(async () => {
    const admin = postgres(url ?? "", { max: 1, onnotice: () => {} });
    const [found] =
      await admin`SELECT 1 FROM pg_database WHERE datname = ${OWN}`;
    if (!found) await admin.unsafe(`CREATE DATABASE ${OWN}`);
    await admin.end();
    const own = new URL(url ?? "");
    own.pathname = `/${OWN}`;
    sql = postgres(own.toString(), { max: 1, onnotice: () => {} });
  });

  beforeEach(async () => {
    await sql`DROP SCHEMA IF EXISTS trips CASCADE`;
    await migrate(sql);
    await importTrip(sql, {
      slug: "japan",
      name: "Japan",
      startDate: "2027-03-19",
      endDate: "2027-04-02",
      public: false,
      stops: [],
      bookings: [],
      legs: [],
    });
    trip = (await tripIdOf(sql, "japan")) as number;
  });
  afterAll(() => sql.end());

  it("keeps found places and shows the other's vote only after mine", async () => {
    await addFound(sql, trip, "Pascal@x.de", [spot("a"), spot("b", 1)]);
    expect(await castVote(sql, trip, alicia, "a", "must")).toEqual({});

    let s = await loadPick(sql, trip, pascal, ALLOWED);
    expect(s.candidates.map((c) => c.id).sort()).toEqual(["a", "b"]);
    expect(s.theirs).toEqual({});
    expect(s.people.map((p) => p.name)).toEqual(["Pascal", "Alicia"]);

    expect(await castVote(sql, trip, pascal, "a", "yes")).toEqual({
      "alicia@x.de": "must",
    });
    s = await loadPick(sql, trip, pascal, ALLOWED);
    expect(s.mine).toEqual({ a: "yes" });
    expect(s.theirs).toEqual({ a: { "alicia@x.de": "must" } });
  });

  it("changes and takes back a vote", async () => {
    await addFound(sql, trip, pascal.email, [spot("a")]);
    await castVote(sql, trip, pascal, "a", "yes");
    await castVote(sql, trip, pascal, "a", "no");
    expect((await loadPick(sql, trip, pascal, ALLOWED)).mine).toEqual({
      a: "no",
    });
    await takeBack(sql, trip, pascal.email, "a");
    expect((await loadPick(sql, trip, pascal, ALLOWED)).mine).toEqual({});
  });

  it("refuses a vote on a place the trip does not have", async () => {
    expect(await castVote(sql, trip, pascal, "nope", "yes")).toBeNull();
  });

  it("drops coordinates after 30 days and keeps fresh ones again", async () => {
    await addFound(sql, trip, pascal.email, [spot("a")]);
    await sql`UPDATE trips.pick_place SET spot_at = now() - interval '31 days'`;
    let [c] = (await loadPick(sql, trip, pascal, ALLOWED)).candidates;
    expect(c?.lat).toBeNull();
    await saveSpots(sql, trip, [{ id: "a", lat: 35.72, lng: 139.8 }]);
    [c] = (await loadPick(sql, trip, pascal, ALLOWED)).candidates;
    expect(c?.lat).toBe(35.72);
  });

  it("leaves the trip's own plan alone", async () => {
    const before = await loadTrip(sql, "japan");
    await addFound(sql, trip, pascal.email, [spot("a")]);
    await castVote(sql, trip, pascal, "a", "must");
    expect(await loadTrip(sql, "japan")).toEqual(before);
  });
});
