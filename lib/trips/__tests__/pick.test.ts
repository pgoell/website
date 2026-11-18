import { describe, expect, it } from "vitest";
import {
  areasOf,
  type Candidate,
  deckOf,
  foundInput,
  matchAfter,
  matchesOf,
  onlyMine,
  onlyTheirs,
  type PickState,
  peopleOf,
  roughDays,
  spotFresh,
  spotsInput,
  waiting,
} from "../pick";

const c = (id: string, addedAt: string, rank: number): Candidate => ({
  id,
  kind: "sight",
  rank,
  lat: 35.7,
  lng: 139.7,
  addedAt,
});

const people = [
  { email: "pascal@x.de", name: "Pascal", me: true },
  { email: "alicia@x.de", name: "Alicia", me: false },
];

const state = (over: Partial<PickState>): PickState => ({
  candidates: [
    c("a", "2026-11-18T10:00:00Z", 0),
    c("b", "2026-11-18T10:00:00Z", 1),
    c("c", "2026-11-18T12:00:00Z", 5),
    c("d", "2026-11-18T09:00:00Z", 0),
  ],
  mine: {},
  theirs: {},
  people,
  ...over,
});

describe("the deck", () => {
  it("shows the newest search first, then Google's order, and skips what I voted on", () => {
    const s = state({ mine: { b: "no" } });
    expect(deckOf(s).map((x) => x.id)).toEqual(["c", "a", "d"]);
  });
});

describe("matches", () => {
  const s = state({
    mine: { a: "yes", b: "must", c: "no", d: "yes" },
    theirs: {
      a: { "alicia@x.de": "must" },
      b: { "alicia@x.de": "no" },
      c: { "alicia@x.de": "yes" },
    },
  });

  it("are what everyone liked, a must counting as yes", () => {
    expect(matchesOf(s).map((x) => x.id)).toEqual(["a"]);
  });
  it("split the rest by who wants what", () => {
    expect(onlyMine(s).map((x) => x.id)).toEqual(["b"]);
    expect(onlyTheirs(s, "alicia@x.de").map((x) => x.id)).toEqual(["c"]);
    expect(waiting(s).map((x) => x.id)).toEqual(["d"]);
  });
  it("are my likes alone when nobody else is on the trip", () => {
    const alone = { ...s, people: [people[0] as (typeof people)[number]] };
    expect(matchesOf(alone).map((x) => x.id)).toEqual(["a", "b", "d"]);
  });
  it("need everyone after a vote", () => {
    expect(matchAfter("yes", { "alicia@x.de": "must" }, people)).toBe(true);
    expect(matchAfter("yes", {}, people)).toBe(false);
    expect(matchAfter("no", { "alicia@x.de": "yes" }, people)).toBe(false);
    expect(matchAfter("yes", {}, [people[0] as (typeof people)[number]])).toBe(
      false,
    );
  });
});

describe("areas", () => {
  // Asakusa: three places within a few hundred metres; Shibuya: two; one far off.
  const spots = [
    { id: "senso", lat: 35.7148, lng: 139.7967 },
    { id: "nakamise", lat: 35.7118, lng: 139.7963 },
    { id: "kappa", lat: 35.713, lng: 139.788 },
    { id: "crossing", lat: 35.6595, lng: 139.7005 },
    { id: "sky", lat: 35.6584, lng: 139.7022 },
    { id: "ghibli", lat: 35.6962, lng: 139.5704 },
  ];

  it("group places that lie close, biggest first", () => {
    const areas = areasOf(spots);
    expect(areas.map((a) => a.ids)).toEqual([
      ["senso", "nakamise", "kappa"],
      ["crossing", "sky"],
      ["ghibli"],
    ]);
    expect(areas[0]?.reach).toBeLessThan(900);
  });

  it("make rough days: small areas join a near day, far ones stand alone", () => {
    const days = roughDays(areasOf(spots));
    expect(days).toEqual([
      ["senso", "nakamise", "kappa"],
      ["crossing", "sky"],
      ["ghibli"],
    ]);
  });

  it("split a big area over days", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      id: `p${i}`,
      lat: 35.7 + i * 0.001,
      lng: 139.7,
    }));
    expect(roughDays(areasOf(many)).map((d) => d.length)).toEqual([6, 3]);
  });
});

describe("people", () => {
  it("are the allowed addresses, me first, named by their votes", () => {
    expect(
      peopleOf(
        " Pascal@x.de, alicia@x.de ,bob@x.de",
        { email: "pascal@x.de", name: "Pascal G" },
        {
          "alicia@x.de": "Alicia K",
        },
      ),
    ).toEqual([
      { email: "pascal@x.de", name: "Pascal G", me: true },
      { email: "alicia@x.de", name: "Alicia K", me: false },
      { email: "bob@x.de", name: "Bob", me: false },
    ]);
  });
  it("are me alone without the list", () => {
    expect(
      peopleOf(undefined, { email: "dev@localhost", name: "Dev" }, {}),
    ).toHaveLength(1);
  });
});

describe("Google's limits", () => {
  it("keep coordinates for 30 days", () => {
    const now = new Date("2026-12-31T00:00:00Z");
    expect(spotFresh(new Date("2026-12-02T00:00:00Z"), now)).toBe(true);
    expect(spotFresh(new Date("2026-11-30T00:00:00Z"), now)).toBe(false);
    expect(spotFresh(null, now)).toBe(false);
  });
});

describe("input from the page", () => {
  const ok = {
    id: "ChIJ8T1GpMGOGGARDYGSgpooDWw",
    kind: "sight",
    rank: 0,
    lat: 35.71,
    lng: 139.79,
  };
  it("takes found places", () => {
    expect(foundInput([ok])).toEqual([ok]);
  });
  it("refuses anything off", () => {
    expect(foundInput([{ ...ok, kind: "casino" }])).toBeNull();
    expect(foundInput([{ ...ok, id: "a b" }])).toBeNull();
    expect(foundInput([{ ...ok, lat: 91 }])).toBeNull();
    expect(foundInput([{ ...ok, rank: 1.5 }])).toBeNull();
    expect(foundInput("x")).toBeNull();
    expect(foundInput(Array.from({ length: 121 }, () => ok))).toBeNull();
    expect(spotsInput([{ id: ok.id, lat: 35, lng: 181 }])).toBeNull();
  });
});
