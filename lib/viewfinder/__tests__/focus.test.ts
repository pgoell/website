import { describe, expect, it } from "vitest";
import {
  apertureScale,
  blurFor,
  PLANES,
  STOPS,
  stepStop,
  toStop,
} from "../focus";

describe("blurFor", () => {
  it("keeps the focused plane sharp", () => {
    for (const p of PLANES) expect(blurFor(p.id, p.id, 1440)).toBe(0);
  });

  it("blurs a plane more the further it lies from the focus", () => {
    expect(blurFor("near", "hills", 1440)).toBeGreaterThan(
      blurFor("church", "hills", 1440),
    );
    expect(blurFor("church", "hills", 1440)).toBeGreaterThan(
      blurFor("town", "hills", 1440),
    );
  });

  it("caps the blur and scales it with the frame width", () => {
    expect(blurFor("sky", "near", 1440)).toBeLessThanOrEqual(6);
    expect(blurFor("sky", "near", 720)).toBeCloseTo(
      blurFor("sky", "near", 1440) / 2,
    );
  });
});

describe("apertureScale", () => {
  it("lets the full blur through wide open and none from f/11", () => {
    expect(apertureScale(2.8)).toBe(1);
    for (const n of [11, 16, 22]) expect(apertureScale(n)).toBe(0);
  });

  it("shrinks the blur as the lens stops down", () => {
    const k = STOPS.map(apertureScale);
    for (let i = 1; i < 5; i++) expect(k[i]).toBeLessThan(k[i - 1] as number);
  });
});

describe("stepStop", () => {
  it("steps one stop and holds at the ends", () => {
    expect(stepStop(2.8, 1)).toBe(4);
    expect(stepStop(4, -1)).toBe(2.8);
    expect(stepStop(2.8, -1)).toBe(2.8);
    expect(stepStop(22, 1)).toBe(22);
  });
});

describe("toStop", () => {
  it("reads a stored stop and falls back on junk", () => {
    expect(toStop("5.6")).toBe(5.6);
    expect(toStop("3")).toBe(2.8);
    expect(toStop(null)).toBe(2.8);
  });
});
