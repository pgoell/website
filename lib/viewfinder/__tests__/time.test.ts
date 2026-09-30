import { describe, expect, it } from "vitest";
import {
  berlinHour,
  berlinZoneName,
  formatHour,
  parseTimeOverride,
  sinceLabel,
} from "../time";

describe("parseTimeOverride", () => {
  it("returns null without a value", () => {
    expect(parseTimeOverride(null)).toBeNull();
  });
  it("parses hours and minutes", () => {
    expect(parseTimeOverride("21")).toBe(21);
    expect(parseTimeOverride("6:30")).toBe(6.5);
  });
  it("treats junk as midnight", () => {
    expect(parseTimeOverride("abc")).toBe(0);
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

describe("formatHour", () => {
  it("pads and rounds", () => {
    expect(formatHour(6.5)).toBe("06:30");
    expect(formatHour(21)).toBe("21:00");
    expect(formatHour(12.9999)).toBe("13:00");
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
