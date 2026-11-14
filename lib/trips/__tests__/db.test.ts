import postgres from "postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { copyRows, countRows, type Rows } from "../copy";
import { importProblems, importTrip } from "../import";
import { migrate } from "../schema";
import { latestTripSlug, listTrips, loadTrip } from "../store";
import type { TripImport } from "../types";

// A throwaway database: a service container in CI, a local one by hand
// (see CLAUDE.md). Never the shared one on the server.
const url = process.env.TEST_DATABASE_URL;

const japan: TripImport = {
  slug: "japan",
  name: "Japan 2027",
  startDate: "2027-03-19",
  endDate: "2027-04-03",
  public: false,
  stops: [
    {
      name: "Tokyo",
      tz: "Asia/Tokyo",
      lat: 35.68,
      lng: 139.72,
      arrive: "2027-03-20",
      depart: "2027-03-23",
    },
    {
      name: "Kyoto",
      tz: "Asia/Tokyo",
      lat: 35.0,
      lng: 135.76,
      arrive: "2027-03-23",
      depart: "2027-03-27",
    },
  ],
  bookings: [
    {
      stopPosition: 1,
      kind: "hotel",
      title: "A hotel",
      startAt: "2027-03-20T15:00",
      startTz: "Asia/Tokyo",
      endAt: "2027-03-23T11:00",
      endTz: "Asia/Tokyo",
      confirmation: "TEST",
      detail: { Room: "Small" },
    },
  ],
  legs: [
    {
      mode: "ground",
      title: "Tokyo to Kyoto",
      how: "Shinkansen",
      leaveDate: "2027-03-23",
      leave: "09:00",
      leaveTz: "Asia/Tokyo",
      arriveDate: "2027-03-23",
      arrive: "11:15",
      arriveTz: "Asia/Tokyo",
      cost: null,
      note: null,
      path: [
        [139.77, 35.68],
        [135.76, 35.0],
      ],
    },
  ],
  dayNotes: { "2027-03-20": "Arrive." },
};

/** A small copy of the trips app's SQLite rows, as bun:sqlite hands them out. */
const sqlite: Rows = {
  trip: [
    {
      id: 4,
      slug: "tanzania",
      name: "Tanzania 2026",
      start_date: "2026-08-21",
      end_date: "2026-08-24",
      public: 1,
    },
  ],
  stop: [
    {
      id: 9,
      trip_id: 4,
      position: 1,
      name: "Rivertrees",
      tz: "Africa/Dar_es_Salaam",
      lat: -3.37,
      lng: 36.86,
      arrive: "2026-08-22",
      depart: "2026-08-24",
    },
  ],
  booking: [],
  leg: [
    {
      id: 7,
      trip_id: 4,
      mode: "ground",
      title: "Rivertrees to the coffee walk and back",
      how: "By car",
      leave_date: "2026-08-23",
      leave: "",
      leave_tz: "Africa/Dar_es_Salaam",
      arrive_date: "2026-08-23",
      arrive: "",
      arrive_tz: "Africa/Dar_es_Salaam",
      cost: null,
      note: null,
      path: "[[36.86,-3.37],[36.9,-3.3]]",
    },
  ],
  place: [
    {
      id: 30,
      trip_id: 4,
      name: "Coffee farm",
      url: null,
      note: null,
      tags: null,
      day: "2026-08-23",
      day_order: 1,
      lat: -3.3,
      lng: 36.9,
      status: "confirmed",
      google_place_id: null,
      created_by: "Alicia",
      created_at: "2026-10-01 08:00:00",
    },
  ],
  leg_path: [
    {
      trip_id: 4,
      leave_date: "2026-08-23",
      title: "Rivertrees to the coffee walk and back",
      path: "[[36.86,-3.37],[36.88,-3.33],[36.9,-3.3]]",
      points:
        '[{"at":[36.86,-3.37],"road":false},{"at":[36.9,-3.3],"road":true}]',
    },
  ],
  day_note: [{ trip_id: 4, date: "2026-08-22", note: "Coffee walk." }],
};

describe.skipIf(!url)("trips in Postgres", () => {
  const sql = postgres(url ?? "", { max: 1, onnotice: () => {} });

  beforeEach(async () => {
    await sql`DROP SCHEMA IF EXISTS trips CASCADE`;
    await migrate(sql);
  });
  afterAll(() => sql.end());

  it("migrates twice without harm", async () => {
    await migrate(sql);
    const [row] = await sql`SELECT max(version) AS v FROM trips.migration`;
    expect(row?.v).toBe(2);
  });

  it("imports a trip and reads it back whole", async () => {
    await importTrip(sql, japan);
    const trip = await loadTrip(sql, "japan");
    expect(trip?.public).toBe(false);
    expect(trip?.stops.map((s) => [s.position, s.name])).toEqual([
      [1, "Tokyo"],
      [2, "Kyoto"],
    ]);
    expect(trip?.bookings[0]?.detail).toEqual({ Room: "Small" });
    expect(trip?.legs[0]?.path).toEqual(japan.legs[0]?.path);
    expect(trip?.legs[0]?.drawn).toBe(false);
    expect(trip?.dayNotes).toEqual({ "2027-03-20": "Arrive." });
    expect(await listTrips(sql)).toEqual([
      {
        slug: "japan",
        name: "Japan 2027",
        startDate: "2027-03-19",
        endDate: "2027-04-03",
        public: false,
        stops: ["Tokyo", "Kyoto"],
      },
    ]);
    expect(await latestTripSlug(sql)).toBe("japan");
    expect(await listTrips(sql, true)).toEqual([]);
    expect(await loadTrip(sql, "japan", true)).toBeUndefined();
  });

  it("keeps a booking's detail in its own order", async () => {
    const detail = { Zone: "z", Address: "a", Note: "n" };
    await importTrip(sql, {
      ...japan,
      bookings: [
        { ...(japan.bookings[0] as TripImport["bookings"][number]), detail },
      ],
    });
    const trip = await loadTrip(sql, "japan");
    expect(Object.keys(trip?.bookings[0]?.detail ?? {})).toEqual([
      "Zone",
      "Address",
      "Note",
    ]);
  });

  it("an import again replaces the vault's part and keeps a saved day note", async () => {
    await importTrip(sql, japan);
    await sql`UPDATE trips.day_note SET note = 'Changed in the app.'`;
    await importTrip(sql, {
      ...japan,
      stops: japan.stops.slice(0, 1),
      dayNotes: { "2027-03-20": "Arrive!" },
    });
    const trip = await loadTrip(sql, "japan");
    expect(trip?.stops).toHaveLength(1);
    expect(trip?.dayNotes["2027-03-20"]).toBe("Changed in the app.");
  });

  it("checks an import's shape", () => {
    expect(importProblems(japan)).toEqual([]);
    expect(importProblems({ ...japan, slug: "../x", stops: [] })).toEqual([
      "slug",
      "no stops",
    ]);
    expect(importProblems(null)).toEqual(["not a JSON object"]);
  });

  it("copies the SQLite rows with their ids, drawn line on top", async () => {
    await copyRows(sql, sqlite);
    expect(await countRows(sql)).toEqual({
      trip: 1,
      stop: 1,
      booking: 0,
      leg: 1,
      place: 1,
      leg_path: 1,
      day_note: 1,
    });
    const trip = await loadTrip(sql, "tanzania");
    expect(trip?.id).toBe(4);
    expect(trip?.public).toBe(true);
    expect(trip?.legs[0]).toMatchObject({ id: 7, drawn: true });
    expect(trip?.legs[0]?.path).toHaveLength(3);
    expect(trip?.legs[0]?.points).toEqual([
      { at: [36.86, -3.37], road: false },
      { at: [36.9, -3.3], road: true },
    ]);
    const [place] = await sql`SELECT created_at FROM trips.place`;
    expect((place?.created_at as Date).toISOString()).toBe(
      "2026-10-01T08:00:00.000Z",
    );
  });

  it("moves the id sequences past the copied ids", async () => {
    await copyRows(sql, sqlite);
    const [row] = await sql<{ id: number }[]>`
      INSERT INTO trips.place (trip_id, name, status, created_by)
      VALUES (4, 'New', 'idea', 'Pascal') RETURNING id`;
    expect(row?.id).toBe(31);
  });

  it("refuses to copy into tables that hold rows", async () => {
    await copyRows(sql, sqlite);
    await expect(copyRows(sql, sqlite)).rejects.toThrow("not empty");
  });
});
