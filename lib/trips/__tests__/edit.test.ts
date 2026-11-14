import { describe, expect, it } from "vitest";
import { drawnPoints, isGoogleId, isIds, placeRow, webUrl } from "../input";
import {
  dayRoute,
  filterPlaces,
  groupByStop,
  mapsLink,
  NO_GOOGLE,
  optional,
  webLink,
} from "../places";
import { chaptersOf, dayPlan, daysBetween, grouped, nightsAt } from "../plan";
import { MOST_POINTS } from "../route";
import type { StoredPlace, StoredStop, StoredTrip } from "../types";

const stop = (
  position: number,
  name: string,
  arrive: string,
  depart: string,
  lng = 0,
): StoredStop => ({
  id: position,
  position,
  name,
  tz: "Asia/Tokyo",
  lat: 0,
  lng,
  arrive,
  depart,
});

const place = (id: number, patch: Partial<StoredPlace> = {}): StoredPlace => ({
  id,
  name: `Place ${id}`,
  url: null,
  note: null,
  tags: null,
  day: null,
  dayOrder: null,
  lat: null,
  lng: null,
  status: "confirmed",
  googlePlaceId: null,
  createdBy: "Someone",
  ...patch,
});

const trip: StoredTrip = {
  id: 1,
  slug: "test",
  name: "Test trip",
  startDate: "2027-03-19",
  endDate: "2027-04-03",
  public: false,
  stops: [
    stop(1, "Tokyo", "2027-03-20", "2027-03-23", 139.7),
    stop(2, "Hakone", "2027-03-23", "2027-03-25", 139.1),
    stop(3, "Takayama", "2027-03-25", "2027-03-27", 137.3),
    stop(4, "Kyoto", "2027-03-27", "2027-03-31", 135.8),
    stop(5, "Osaka", "2027-03-31", "2027-04-02", 135.5),
    stop(6, "Tokyo", "2027-04-02", "2027-04-03", 139.7),
  ],
  bookings: [],
  legs: [],
  places: [],
  dayNotes: {},
};

// Ported from the trips app's lib/plan.test.ts.
describe("plan of a longer trip", () => {
  it("puts every day of the trip in one chapter, in order", () => {
    const days = daysBetween(trip.startDate, trip.endDate);
    const chapters = chaptersOf(
      trip,
      days.map((d) => dayPlan(trip, d)),
    );
    expect(chapters.flatMap((c) => c.days.map((d) => d.date))).toEqual(days);
    expect(chapters[0]?.kind).toBe("out");
    expect(chapters.at(-1)?.kind).toBe("home");
    expect(chapters.filter((c) => c.stop).map((c) => c.stop?.name)).toEqual([
      "Tokyo",
      "Hakone",
      "Takayama",
      "Kyoto",
      "Osaka",
      "Tokyo",
    ]);
  });

  it("counts nights and groups numbers", () => {
    expect(nightsAt(trip.stops[3] as StoredStop)).toBe(4);
    expect(grouped(1470, "en")).toBe("1,470");
    expect(grouped(1470, "de")).toBe("1.470");
    expect(grouped(980, "en")).toBe("980");
  });
});

describe("places", () => {
  const day = "2027-03-28";
  const withPlaces: StoredTrip = {
    ...trip,
    places: [
      place(1, { day, dayOrder: 1, lat: 0, lng: 135.81 }),
      place(2, { day, dayOrder: 0, lat: 0, lng: 135.82 }),
      place(3, { day, lat: 0, lng: 135.83, status: "idea" }),
      place(4, { day: "2027-03-29" }),
      place(5, { tags: "food, optional", note: "Sunrise coffee" }),
    ],
  };

  it("routes a day from its hotel through its places in order", () => {
    const route = dayRoute(withPlaces, day);
    expect(route.places.map((p) => p.id)).toEqual([2, 1, 3]);
    expect(route.lines).toHaveLength(1);
    expect(route.lines[0]?.[0]).toEqual([135.8, 0]);
    expect(route.lines[0]?.at(-1)).toEqual([135.8, 0]);
    expect(route.steps.size).toBe(3);
  });

  it("groups places by their nearest stop, the pinless last", () => {
    const groups = groupByStop(withPlaces.stops, withPlaces.places);
    expect(groups.map(([name, list]) => [name, list.length])).toEqual([
      ["Kyoto", 3],
      [null, 2],
    ]);
  });

  it("filters by every word, and knows an optional place", () => {
    expect(
      filterPlaces(withPlaces.places, "sunrise FOOD").map((p) => p.id),
    ).toEqual([5]);
    expect(optional(withPlaces.places[4] as StoredPlace)).toBe(true);
    expect(optional(withPlaces.places[0] as StoredPlace)).toBe(false);
  });

  it("links to Google Maps by its id, or by name near the pin", () => {
    const p = { name: "A café", lat: 1, lng: 2, url: null };
    expect(mapsLink(p)).toBe(
      "https://www.google.com/maps/search/A%20caf%C3%A9/@1,2,17z",
    );
    expect(mapsLink({ ...p, googlePlaceId: "abc" })).toContain(
      "query_place_id=abc",
    );
    expect(mapsLink({ ...p, googlePlaceId: NO_GOOGLE })).not.toContain(
      "query_place_id",
    );
    expect(webLink("javascript:alert(1)")).toBeNull();
    expect(webLink("https://example.com")).toBe("https://example.com");
  });
});

describe("input from the editing view", () => {
  const good = {
    name: " Tea house ",
    url: "https://example.com/tea",
    note: "",
    tags: null,
    day: "2027-03-28",
    lat: 35,
    lng: 135.7,
    status: "idea",
  };

  it("takes a sound place and trims it", () => {
    expect(placeRow(good)).toEqual({
      name: "Tea house",
      url: "https://example.com/tea",
      note: null,
      tags: null,
      day: "2027-03-28",
      lat: 35,
      lng: 135.7,
      status: "idea",
    });
  });

  it("refuses what the form cannot have sent", () => {
    expect(placeRow({ ...good, name: "  " })).toBe("noName");
    expect(placeRow({ ...good, url: "javascript:alert(1)" })).toBe("badLink");
    expect(placeRow({ ...good, url: "ftp://example.com" })).toBe("badLink");
    expect(placeRow({ ...good, day: "28.03.2027" })).toBe("badInput");
    expect(placeRow({ ...good, status: "booked" })).toBe("badInput");
    expect(placeRow({ ...good, name: 5 })).toBe("badInput");
    expect(placeRow({ ...good, note: "x".repeat(5001) })).toBe("badInput");
    expect(placeRow(null)).toBe("badInput");
  });

  it("keeps a pin only with both halves", () => {
    const row = placeRow({ ...good, lng: Number.NaN });
    expect(row).toMatchObject({ lat: null, lng: null });
    expect(placeRow({ ...good, lat: 91 })).toMatchObject({ lat: null });
  });

  it("checks links, ids and Google's ids", () => {
    expect(webUrl("")).toBeNull();
    expect(webUrl("http://x.org")).toBe("http://x.org");
    expect(webUrl("not a link")).toBeUndefined();
    expect(isIds([1, 2, 3])).toBe(true);
    expect(isIds([1, "2"])).toBe(false);
    expect(isIds([1.5])).toBe(false);
    expect(isGoogleId(null)).toBe(true);
    expect(isGoogleId("none")).toBe(true);
    expect(isGoogleId("ChIJ-abc_123")).toBe(true);
    expect(isGoogleId("<script>")).toBe(false);
  });

  it("keeps a drawn point to what a point holds", () => {
    expect(
      drawnPoints([
        { at: [1, 2], road: false, extra: "x" },
        { at: [1.1, 2], road: false, line: [[1.05, 2.01]] },
        { at: [1.2, 2], road: true, line: [[1.15, 2.01]] },
      ]),
    ).toEqual([
      { at: [1, 2], road: false },
      { at: [1.1, 2], road: false, line: [[1.05, 2.01]] },
      { at: [1.2, 2], road: true },
    ]);
  });

  it("refuses a line that is not one", () => {
    const p = { at: [1, 2], road: true };
    expect(drawnPoints([p])).toBeNull();
    expect(drawnPoints(Array(MOST_POINTS + 1).fill(p))).toBeNull();
    expect(drawnPoints([p, { at: [1, 200], road: true }])).toBeNull();
    expect(drawnPoints([p, { at: [1, 2], road: "yes" }])).toBeNull();
    expect(drawnPoints([p, { ...p, line: [[1, "2"]] }])).toBeNull();
    expect(drawnPoints("[]")).toBeNull();
  });
});
