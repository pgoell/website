import { describe, expect, it } from "vitest";
import { berlinHour, berlinInstant, berlinZoneName, sinceLabel } from "../time";

describe("berlinInstant", () => {
  const now = new Date("2026-07-01T10:15:00Z");
  it("keeps now when nothing is given", () => {
    expect(berlinInstant(null, null, now).toISOString()).toBe(
      "2026-07-01T10:15:00.000Z",
    );
  });
  it("reads the time as Berlin local on today's date", () => {
    expect(berlinInstant(null, "21", now).toISOString()).toBe(
      "2026-07-01T19:00:00.000Z",
    );
    expect(berlinInstant(null, "6:30", now).toISOString()).toBe(
      "2026-07-01T04:30:00.000Z",
    );
  });
  it("uses CET for a winter date even when now is in summer", () => {
    expect(berlinInstant("2026-12-21", "16:00", now).toISOString()).toBe(
      "2026-12-21T15:00:00.000Z",
    );
    expect(berlinInstant("2026-12-21", null, now).toISOString()).toBe(
      "2026-12-21T11:15:00.000Z",
    );
  });
  it("uses CEST for a summer date when now is in winter", () => {
    const winter = new Date("2026-01-15T08:00:00Z");
    expect(berlinInstant("2026-06-21", "23:00", winter).toISOString()).toBe(
      "2026-06-21T21:00:00.000Z",
    );
  });
});

describe("berlinHour", () => {
  it("uses CEST in summer", () => {
    expect(berlinHour(new Date("2026-07-01T10:15:00Z"))).toBe(12.25);
    expect(berlinZoneName(new Date("2026-07-01T10:15:00Z"))).toBe("CEST");
  });
  it("uses CET in winter", () => {
    expect(berlinHour(new Date("2026-01-15T23:30:00Z"))).toBe(0.5);
    expect(berlinZoneName(new Date("2026-01-15T23:30:00Z"))).toBe("CET");
  });
});

describe("sinceLabel", () => {
  const now = new Date("2026-09-30T12:00:00Z");
  it("counts minutes, hours, then days", () => {
    expect(sinceLabel("2026-09-30T11:20:00Z", now)).toBe("40M");
    expect(sinceLabel("2026-09-30T09:59:00Z", now)).toBe("2H");
    expect(sinceLabel("2026-09-27T11:00:00Z", now)).toBe("3D");
  });
});
