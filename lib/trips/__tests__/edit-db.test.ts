import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  deleteLegPath,
  deletePlace,
  hasGroundLeg,
  insertPlace,
  orderDay,
  type PlaceRow,
  saveDayNote,
  saveLegPath,
  setGooglePlaceId,
  tripIdOf,
  updatePlace,
} from "../edit";
import { importTrip } from "../import";
import { migrate } from "../schema";
import { loadTrip } from "../store";
import type { DrawnPoint, TripImport } from "../types";

// A throwaway database, as in db.test.ts. Never the shared one on the server.
// The test files run side by side, so this one keeps a database of its own
// next to the one db.test.ts drops and makes anew.
const url = process.env.TEST_DATABASE_URL;
const OWN = "trips_edit_test";

const trip = (slug: string): TripImport => ({
  slug,
  name: `Trip ${slug}`,
  startDate: "2027-03-19",
  endDate: "2027-03-25",
  public: true,
  stops: [
    {
      name: "First stop",
      tz: "Asia/Tokyo",
      lat: 35.68,
      lng: 139.72,
      arrive: "2027-03-20",
      depart: "2027-03-23",
    },
  ],
  bookings: [],
  legs: [
    {
      mode: "ground",
      title: "Out and back",
      how: "By car",
      leaveDate: "2027-03-21",
      leave: "",
      leaveTz: "Asia/Tokyo",
      arriveDate: "2027-03-21",
      arrive: "",
      arriveTz: "Asia/Tokyo",
      cost: null,
      note: null,
      path: [
        [139.72, 35.68],
        [139.8, 35.7],
      ],
    },
  ],
});

const row = (patch: Partial<PlaceRow> = {}): PlaceRow => ({
  name: "A tea house",
  url: null,
  note: null,
  tags: null,
  day: "2027-03-21",
  lat: 35.69,
  lng: 139.75,
  status: "idea",
  ...patch,
});

describe.skipIf(!url)("changing a trip in Postgres", () => {
  let sql: Sql;
  let id = 0;
  let other = 0;

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
    id = await importTrip(sql, trip("one"));
    other = await importTrip(sql, trip("two"));
  });
  afterAll(() => sql.end());

  it("finds a trip by its slug", async () => {
    expect(await tripIdOf(sql, "one")).toBe(id);
    expect(await tripIdOf(sql, "none")).toBeUndefined();
  });

  it("adds, changes and deletes a place", async () => {
    const placeId = await insertPlace(sql, id, row(), "Someone");
    let [p] = (await loadTrip(sql, "one"))?.places ?? [];
    expect(p).toMatchObject({
      id: placeId,
      name: "A tea house",
      status: "idea",
      createdBy: "Someone",
    });
    expect(
      await updatePlace(sql, id, placeId, row({ status: "confirmed" })),
    ).toBe(true);
    [p] = (await loadTrip(sql, "one"))?.places ?? [];
    expect(p?.status).toBe("confirmed");
    await deletePlace(sql, id, placeId);
    expect((await loadTrip(sql, "one"))?.places).toEqual([]);
  });

  it("changes nothing in another trip", async () => {
    const placeId = await insertPlace(sql, id, row(), "Someone");
    expect(await updatePlace(sql, other, placeId, row({ name: "Taken" }))).toBe(
      false,
    );
    await deletePlace(sql, other, placeId);
    expect(await setGooglePlaceId(sql, other, placeId, "elsewhere")).toBe(
      false,
    );
    expect(await orderDay(sql, other, "2027-03-21", [placeId])).toBe(false);
    const [p] = (await loadTrip(sql, "one"))?.places ?? [];
    expect(p).toMatchObject({
      name: "A tea house",
      googlePlaceId: null,
      dayOrder: null,
    });
  });

  it("orders a day, and a place moved to another day goes last there", async () => {
    const a = await insertPlace(sql, id, row({ name: "A" }), "Someone");
    const b = await insertPlace(sql, id, row({ name: "B" }), "Someone");
    expect(await orderDay(sql, id, "2027-03-21", [b, a])).toBe(true);
    const order = async () =>
      Object.fromEntries(
        ((await loadTrip(sql, "one"))?.places ?? []).map((p) => [
          p.name,
          p.dayOrder,
        ]),
      );
    expect(await order()).toEqual({ A: 1, B: 0 });
    // Same day: the order stays. Another day: it goes.
    await updatePlace(sql, id, a, row({ name: "A", note: "Changed" }));
    expect((await order()).A).toBe(1);
    await updatePlace(sql, id, a, row({ name: "A", day: "2027-03-22" }));
    expect((await order()).A).toBeNull();
    await updatePlace(sql, id, b, row({ name: "B", day: null }));
    expect((await order()).B).toBeNull();
  });

  it("reports a place deleted in the meantime, and keeps a day's order whole", async () => {
    const a = await insertPlace(sql, id, row({ name: "A" }), "Someone");
    const b = await insertPlace(sql, id, row({ name: "B" }), "Someone");
    await deletePlace(sql, id, b);
    expect(await updatePlace(sql, id, b, row())).toBe(false);
    expect(await setGooglePlaceId(sql, id, b, "none")).toBe(false);
    expect(await orderDay(sql, id, "2027-03-21", [a, b])).toBe(false);
    const [p] = (await loadTrip(sql, "one"))?.places ?? [];
    expect(p?.dayOrder).toBeNull();
  });

  it("keeps Google's id for a place", async () => {
    const placeId = await insertPlace(sql, id, row(), "Someone");
    expect(await setGooglePlaceId(sql, id, placeId, "none")).toBe(true);
    const [p] = (await loadTrip(sql, "one"))?.places ?? [];
    expect(p?.googlePlaceId).toBe("none");
  });

  it("saves a day note and replaces it", async () => {
    await saveDayNote(sql, id, "2027-03-21", "Early start.");
    await saveDayNote(sql, id, "2027-03-21", "Late start.");
    expect((await loadTrip(sql, "one"))?.dayNotes).toEqual({
      "2027-03-21": "Late start.",
    });
  });

  it("draws a leg's line with a stretch by hand, and goes back", async () => {
    expect(await hasGroundLeg(sql, id, "2027-03-21", "Out and back")).toBe(
      true,
    );
    expect(await hasGroundLeg(sql, id, "2027-03-21", "Elsewhere")).toBe(false);
    const points: DrawnPoint[] = [
      { at: [139.72, 35.68], road: false },
      { at: [139.75, 35.69], road: false, line: [[139.73, 35.685]] },
      { at: [139.8, 35.7], road: true },
    ];
    const path: [number, number][] = [
      [139.72, 35.68],
      [139.73, 35.685],
      [139.75, 35.69],
      [139.8, 35.7],
    ];
    await saveLegPath(sql, id, "2027-03-21", "Out and back", path, points);
    let [leg] = (await loadTrip(sql, "one"))?.legs ?? [];
    expect(leg).toMatchObject({ drawn: true, path, points });
    await deleteLegPath(sql, id, "2027-03-21", "Out and back");
    [leg] = (await loadTrip(sql, "one"))?.legs ?? [];
    expect(leg?.drawn).toBe(false);
    expect(leg?.points).toBeNull();
    expect(leg?.path).toHaveLength(2);
  });
});
