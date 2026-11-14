import { describe, expect, it } from "vitest";
import { isLook } from "../look";
import {
  arc,
  chaptersOf,
  coords,
  dayLabel,
  dayPlan,
  daysBetween,
  nightsAt,
  roadKm,
  zoneName,
} from "../plan";
import { shownTrip } from "../shown";
import type { StoredTrip } from "../types";

const stop = {
  tz: "Africa/Dar_es_Salaam",
};

const place = {
  url: null,
  note: null,
  tags: null,
  day: null,
  dayOrder: null,
  lat: null,
  lng: null,
  status: "confirmed" as const,
  googlePlaceId: null,
  createdBy: "Pascal",
};

const stored: StoredTrip = {
  id: 1,
  slug: "tanzania",
  name: "Tanzania 2026",
  startDate: "2026-08-21",
  endDate: "2026-08-24",
  public: true,
  stops: [
    {
      ...stop,
      id: 1,
      position: 1,
      name: "Rivertrees",
      lat: -3.37,
      lng: 36.86,
      arrive: "2026-08-22",
      depart: "2026-08-23",
    },
    {
      ...stop,
      id: 2,
      position: 2,
      name: "Burunge",
      lat: -3.87,
      lng: 35.85,
      arrive: "2026-08-23",
      depart: "2026-08-24",
    },
  ],
  bookings: [
    {
      id: 1,
      stopPosition: 1,
      kind: "hotel",
      title: "Rivertrees",
      startAt: "2026-08-22T14:00",
      startTz: "Africa/Dar_es_Salaam",
      endAt: "2026-08-23T10:00",
      endTz: "Africa/Dar_es_Salaam",
      confirmation: "SECRET",
      detail: { Price: "a price" },
    },
  ],
  legs: [
    {
      id: 1,
      mode: "flight",
      title: "Frankfurt to Addis Ababa",
      how: "ET 707",
      leaveDate: "2026-08-21",
      leave: "22:05",
      leaveTz: "Europe/Berlin",
      arriveDate: "2026-08-22",
      arrive: "05:55",
      arriveTz: "Africa/Addis_Ababa",
      cost: "a price",
      note: null,
      path: [
        [8.57, 50.03],
        [38.8, 8.98],
      ],
      own: false,
      drawn: false,
      points: null,
    },
    {
      id: 2,
      mode: "ground",
      title: "Rivertrees to Burunge",
      how: "By car",
      leaveDate: "2026-08-23",
      leave: "",
      leaveTz: "Africa/Dar_es_Salaam",
      arriveDate: "2026-08-23",
      arrive: "",
      arriveTz: "Africa/Dar_es_Salaam",
      cost: null,
      note: null,
      path: [
        [36.86, -3.37],
        [36.2, -3.6],
        [35.85, -3.87],
      ],
      own: false,
      drawn: true,
      points: [{ at: [36.86, -3.37], road: true }],
    },
  ],
  places: [
    {
      ...place,
      id: 3,
      name: "Second",
      day: "2026-08-23",
      dayOrder: 2,
      lat: -3.5,
      lng: 36.5,
    },
    {
      ...place,
      id: 2,
      name: "First",
      day: "2026-08-23",
      dayOrder: 1,
      url: "javascript:x",
    },
    { ...place, id: 1, name: "An idea", status: "idea" },
  ],
  dayNotes: { "2026-08-22": "Coffee walk." },
};

describe("shownTrip", () => {
  const trip = shownTrip(stored);
  it("keeps the plan and drops what a visitor may not see", () => {
    expect(trip.stops.map((s) => s.name)).toEqual(["Rivertrees", "Burunge"]);
    expect(trip.legs.map((l) => l.title)).toEqual([
      "Frankfurt to Addis Ababa",
      "Rivertrees to Burunge",
    ]);
    expect(trip.places.map((p) => p.name)).toEqual(["Second", "First"]);
    expect(trip.dayNotes).toEqual({ "2026-08-22": "Coffee walk." });
    const text = JSON.stringify(trip);
    for (const hidden of [
      "bookings",
      "SECRET",
      "a price",
      "Pascal",
      "points",
      "An idea",
    ]) {
      expect(text).not.toContain(hidden);
    }
  });
  it("lets only web links through", () => {
    expect(trip.places[1]?.url).toBeNull();
  });
});

describe("plan", () => {
  const trip = shownTrip(stored);
  it("lists the days, both ends included", () => {
    expect(daysBetween("2026-08-30", "2026-09-02")).toEqual([
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
    ]);
  });
  it("labels a day in both languages", () => {
    expect(dayLabel("2026-08-22", "en")).toBe("Sat 22 Aug");
    expect(dayLabel("2026-08-22", "de")).toBe("Sa 22. Aug.");
  });
  it("names the place of a time zone", () => {
    expect(zoneName("Africa/Dar_es_Salaam")).toBe("Dar es Salaam");
  });
  it("plans a day: both stops on a travel day, places in order", () => {
    const day = dayPlan(trip, "2026-08-23");
    expect(day.stops.map((s) => s.name)).toEqual(["Rivertrees", "Burunge"]);
    expect(day.places.map((p) => p.name)).toEqual(["First", "Second"]);
    expect(day.points).toHaveLength(4);
    expect(day.note).toBeNull();
  });
  it("falls back to the stops when a day has nothing on the map", () => {
    const day = dayPlan(trip, "2026-08-22");
    expect(day.points).toEqual([[36.86, -3.37]]);
    expect(day.note).toBe("Coffee walk.");
  });
  it("draws a flight as an arc between its ends", () => {
    const line = arc([8.57, 50.03], [38.8, 8.98], 8);
    expect(line).toHaveLength(9);
    expect(line[0]?.[0]).toBeCloseTo(8.57);
    expect(line[8]?.[1]).toBeCloseTo(8.98);
    expect(arc([1, 1], [1, 1])).toEqual([
      [1, 1],
      [1, 1],
    ]);
  });
  it("writes coordinates with their hemisphere", () => {
    expect(coords(-2.814, 35.66)).toBe("2.81S 35.66E");
    expect(coords(50.2, -9.19)).toBe("50.20N 9.19W");
  });
});

describe("chapters", () => {
  const trip = shownTrip(stored);
  const days = daysBetween(trip.startDate, trip.endDate).map((d) =>
    dayPlan(trip, d),
  );
  it("groups the days by stop, with the way there and the way home", () => {
    const chapters = chaptersOf(trip, days);
    expect(chapters.map((c) => c.key)).toEqual([
      "out",
      "stop-1",
      "stop-2",
      "home",
    ]);
    expect(chapters.map((c) => c.days.map((d) => d.index))).toEqual([
      [0],
      [1],
      [2],
      [3],
    ]);
    // The day of the move opens the chapter of the stop it leads to.
    expect(chapters[2]?.days[0]?.legs[0]?.title).toBe("Rivertrees to Burunge");
    expect(chapters[1]?.nights).toBe(1);
    expect(chapters[0]?.stop).toBeNull();
  });
  it("counts nights and road kilometres", () => {
    expect(nightsAt(trip.stops[0] as (typeof trip.stops)[number])).toBe(1);
    const km = roadKm(trip);
    expect(km % 10).toBe(0);
    expect(km).toBeGreaterThan(100);
    expect(km).toBeLessThan(150);
    expect(roadKm({ ...trip, legs: [] })).toBe(0);
  });
});

describe("look", () => {
  it("accepts only the looks it knows", () => {
    expect(isLook("night")).toBe(true);
    expect(isLook("day")).toBe(true);
    expect(isLook("print")).toBe(false);
    expect(isLook(null)).toBe(false);
  });
});

describe("tiles", () => {
  it("accepts only tiles inside the grid", async () => {
    const { isTile } = await import("../tiles");
    expect(isTile(0, 0, 0)).toBe(true);
    expect(isTile(14, 16383, 16383)).toBe(true);
    expect(isTile(3, 8, 0)).toBe(false);
    expect(isTile(15, 0, 0)).toBe(false);
    expect(isTile(2, 1.5, 0)).toBe(false);
    expect(isTile(Number.NaN, 0, 0)).toBe(false);
  });
  it("lets satellite tiles go deeper", async () => {
    const { isSatelliteTile } = await import("../tiles");
    expect(isSatelliteTile(19, 0, 0)).toBe(true);
    expect(isSatelliteTile(20, 0, 0)).toBe(false);
    expect(isSatelliteTile(3, 8, 0)).toBe(false);
  });
  it("asks Esri for a row before a column and passes only images on", async () => {
    const { satellite } = await import("../tiles");
    const asked: string[] = [];
    const real = globalThis.fetch;
    try {
      globalThis.fetch = (async (url: string) => {
        asked.push(url);
        return new Response(new Uint8Array([1, 2, 3]), {
          headers: { "Content-Type": "image/jpeg" },
        });
      }) as unknown as typeof fetch;
      const ok = await satellite(5, 19, 16, "a key&more");
      expect(asked[0]).toMatch(/\/tile\/5\/16\/19\?token=a%20key%26more$/);
      expect(ok.status).toBe(200);
      expect(ok.headers.get("Content-Type")).toBe("image/jpeg");
      expect(ok.headers.get("Cache-Control")).toContain("private");

      // A refused key answers 200 with JSON. That is no tile.
      globalThis.fetch = (async () =>
        new Response('{"error":{"code":499}}', {
          headers: { "Content-Type": "text/plain" },
        })) as unknown as typeof fetch;
      expect((await satellite(5, 19, 16, "k")).status).toBe(502);
    } finally {
      globalThis.fetch = real;
    }
  });
  it("accepts only whole glyph blocks", async () => {
    const { isGlyphRange } = await import("../tiles");
    expect(isGlyphRange("0-255.pbf")).toBe(true);
    expect(isGlyphRange("20224-20479.pbf")).toBe(true);
    expect(isGlyphRange("0-256.pbf")).toBe(false);
    expect(isGlyphRange("../0-255.pbf")).toBe(false);
  });
});
