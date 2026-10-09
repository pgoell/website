import { describe, expect, it } from "vitest";
import { seasonOf } from "../season";

describe("seasonOf", () => {
  it("maps months to meteorological seasons", () => {
    expect(seasonOf(new Date("2026-01-15T12:00:00Z"))).toBe("winter");
    expect(seasonOf(new Date("2026-04-15T12:00:00Z"))).toBe("spring");
    expect(seasonOf(new Date("2026-06-21T12:00:00Z"))).toBe("summer");
    expect(seasonOf(new Date("2026-10-15T12:00:00Z"))).toBe("autumn");
    expect(seasonOf(new Date("2026-12-21T12:00:00Z"))).toBe("winter");
  });
  it("turns at Berlin midnight, not UTC midnight", () => {
    expect(seasonOf(new Date("2026-05-31T21:59:00Z"))).toBe("spring");
    expect(seasonOf(new Date("2026-05-31T22:01:00Z"))).toBe("summer");
  });
});
