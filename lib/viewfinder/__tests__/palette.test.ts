import { describe, expect, it } from "vitest";
import { mix, rgba } from "../color";
import { PALETTES, paletteFor } from "../palette";

describe("mix", () => {
  it("returns the ends at 0 and 1", () => {
    expect(mix("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mix("#000000", "#ffffff", 1)).toBe("#ffffff");
  });
  it("blends in between", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});

describe("rgba", () => {
  it("clamps alpha", () => {
    expect(rgba("#ff0000", 2)).toBe("rgba(255,0,0,1.000)");
  });
});

describe("paletteFor", () => {
  it("is full night once the sun is 9 degrees down, morning or evening", () => {
    expect(paletteFor(-9, false)).toEqual(PALETTES.night);
    expect(paletteFor(-40, true)).toEqual(PALETTES.night);
  });
  it("is full day from 12 degrees up", () => {
    expect(paletteFor(12, true)).toEqual(PALETTES.day);
    expect(paletteFor(63, false)).toEqual(PALETTES.day);
  });
  it("shows the sunset look at the evening horizon and dawn at the morning one", () => {
    expect(paletteFor(0.4, false)).toEqual(PALETTES.gold);
    expect(paletteFor(0.4, true)).toEqual(PALETTES.dawn);
  });
  it("floodlights the church only after dark", () => {
    expect(paletteFor(30, false).flood).toBe(0);
    expect(paletteFor(-10, false).flood).toBe(1);
  });
  it("changes without a jump across a stop", () => {
    const a = paletteFor(-5.01, false);
    const b = paletteFor(-4.99, false);
    expect(Math.abs(a.dark - b.dark)).toBeLessThan(0.01);
  });
});
