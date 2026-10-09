import { describe, expect, it } from "vitest";
import { sunAt, sunCrossings } from "../sun";

const at = (iso: string) => sunAt(new Date(iso));

describe("sunAt over Gelnhausen", () => {
  it("culminates at 90 minus latitude plus declination", () => {
    expect(at("2026-06-21T11:25:00Z").alt).toBeCloseTo(63.24, 1);
    expect(at("2026-03-20T11:31:00Z").alt).toBeCloseTo(39.75, 0);
    expect(at("2026-12-21T11:21:00Z").alt).toBeCloseTo(16.37, 1);
  });
  it("stands due south at local noon", () => {
    expect(at("2026-06-21T11:25:00Z").az).toBeCloseTo(180, 0);
  });
  // sunset is the upper limb on the horizon with refraction: centre at -0.83 degrees
  it("sets at 21:37 CEST in the north-west at midsummer", () => {
    const p = at("2026-06-21T19:37:00Z");
    expect(Math.abs(p.alt + 0.83)).toBeLessThan(0.4);
    expect(Math.abs(p.az - 309)).toBeLessThan(2);
    expect(p.rising).toBe(false);
  });
  it("sets at 18:36 CET due west at the equinox", () => {
    const p = at("2026-03-20T17:36:00Z");
    expect(Math.abs(p.alt + 0.83)).toBeLessThan(0.4);
    expect(Math.abs(p.az - 271)).toBeLessThan(2);
  });
  it("sets at 16:22 CET in the south-west at midwinter", () => {
    const p = at("2026-12-21T15:22:00Z");
    expect(Math.abs(p.alt + 0.83)).toBeLessThan(0.4);
    expect(Math.abs(p.az - 232.5)).toBeLessThan(2);
  });
  it("rises in the north-east at midsummer, before noon", () => {
    const p = at("2026-06-21T03:12:00Z");
    expect(Math.abs(p.alt + 0.83)).toBeLessThan(0.4);
    expect(Math.abs(p.az - 50)).toBeLessThan(2);
    expect(p.rising).toBe(true);
  });
  it("never gets astronomically dark in June", () => {
    expect(at("2026-06-21T21:00:00Z").alt).toBeGreaterThan(-12);
    expect(at("2026-06-21T23:27:00Z").alt).toBeGreaterThan(-18);
  });
});

describe("sunCrossings over Gelnhausen", () => {
  const near = (d: Date, iso: string) =>
    expect(Math.abs(d.getTime() - Date.parse(iso))).toBeLessThan(3 * 60000);

  it("brackets a midsummer afternoon with sunrise and sunset", () => {
    const c = sunCrossings(new Date("2026-06-21T13:00:00Z"));
    expect(c.up).toBe(true);
    near(c.last, "2026-06-21T03:12:00Z");
    near(c.next, "2026-06-21T19:37:00Z");
  });
  it("brackets a midwinter night with sunset and the next sunrise", () => {
    const c = sunCrossings(new Date("2026-12-21T22:00:00Z"));
    expect(c.up).toBe(false);
    near(c.last, "2026-12-21T15:22:00Z");
    near(c.next, "2026-12-22T07:21:00Z");
  });
});
