import { describe, expect, it } from "vitest";
import { mix, rgba } from "../color";
import { PALETTES, paletteAt } from "../palette";

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

describe("paletteAt", () => {
  it("is full night at midnight and 3 am", () => {
    expect(paletteAt(0)).toEqual(PALETTES.night);
    expect(paletteAt(3).skyT).toBe(PALETTES.night.skyT);
  });
  it("hits the keyframes exactly", () => {
    expect(paletteAt(6.6).skyT).toBe(PALETTES.dawn.skyT);
    expect(paletteAt(19.1).sunX).toBe(PALETTES.gold.sunX);
  });
  it("puts the sun in the east in the morning and the west in the evening", () => {
    expect(paletteAt(10).sunX).toBeGreaterThan(800);
    expect(paletteAt(18).sunX).toBeLessThan(800);
  });
  it("floodlights the church only after dark", () => {
    expect(paletteAt(12).flood).toBe(0);
    expect(paletteAt(22).flood).toBe(1);
  });
  it("wraps hours outside 0 to 24", () => {
    expect(paletteAt(26)).toEqual(paletteAt(2));
    expect(paletteAt(-1)).toEqual(paletteAt(23));
  });
});
