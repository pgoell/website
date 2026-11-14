import { describe, expect, it } from "vitest";
import { hasHint, signInHref, toPrivateList, toPrivateTrip } from "../private";

describe("hasHint", () => {
  it("finds the trips app's hint among other cookies", () => {
    expect(hasHint("NEXT_LOCALE=de; trips_signed_in=1")).toBe(true);
    expect(hasHint("trips_signed_in=1")).toBe(true);
  });

  it("ignores lookalikes and an empty jar", () => {
    expect(hasHint("")).toBe(false);
    expect(hasHint("NEXT_LOCALE=de")).toBe(false);
    expect(hasHint("trips_signed_in=0")).toBe(false);
    expect(hasHint("xtrips_signed_in=1")).toBe(false);
  });
});

describe("signInHref", () => {
  it("sends the return address along, encoded", () => {
    expect(signInHref("https://pgoell.com/en/trips?x=1")).toBe(
      "https://trips.pgoell.com/auth/login?next=https%3A%2F%2Fpgoell.com%2Fen%2Ftrips%3Fx%3D1",
    );
  });
});

const card = (slug: string, open: unknown) => ({
  slug,
  name: slug.toUpperCase(),
  startDate: "2027-03-19",
  endDate: "2027-04-03",
  public: open,
  stops: ["Tokyo", 3],
});

describe("toPrivateList", () => {
  it("keeps good trips and marks only a true public as open", () => {
    const list = toPrivateList({
      name: "Pascal",
      trips: [
        card("japan", false),
        card("tanzania", true),
        card("x", "yes"),
        {},
      ],
    });
    expect(list?.name).toBe("Pascal");
    expect(list?.trips.map((t) => [t.slug, t.public])).toEqual([
      ["japan", false],
      ["tanzania", true],
      ["x", false],
    ]);
    expect(list?.trips[0].stops).toEqual(["Tokyo"]);
  });

  it("refuses a body without a name or a list", () => {
    expect(toPrivateList(null)).toBeNull();
    expect(toPrivateList({ trips: [] })).toBeNull();
    expect(toPrivateList({ name: "Pascal" })).toBeNull();
  });
});

describe("toPrivateTrip", () => {
  it("wants the slug it asked for", () => {
    const trip = {
      ...card("japan", false),
      stops: [
        {
          position: 1,
          name: "Tokyo",
          tz: "Asia/Tokyo",
          lat: 35.68,
          lng: 139.72,
          arrive: "2027-03-20",
          depart: "2027-03-23",
        },
      ],
    };
    expect(toPrivateTrip({ trip }, "japan")?.name).toBe("JAPAN");
    expect(toPrivateTrip({ trip }, "kyoto")).toBeNull();
    expect(toPrivateTrip({}, "japan")).toBeNull();
  });
});
