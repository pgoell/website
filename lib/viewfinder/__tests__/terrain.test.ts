import { describe, expect, it } from "vitest";
import { PROJECTS } from "../projects";
import {
  altitudeAt,
  buildField,
  contour,
  elevation,
  formatPosition,
  river,
} from "../terrain";

describe("terrain", () => {
  it("keeps the valley floor low and the hills high", () => {
    const valley = elevation(0.5, river(0.5), 2, []);
    const north = elevation(0.5, 0.05, 2, []);
    const south = elevation(0.5, 0.95, 2, []);
    expect(valley).toBeLessThan(160);
    expect(north).toBeGreaterThan(valley + 150);
    expect(south).toBeGreaterThan(valley + 100);
  });

  it("raises a hill under every project pin", () => {
    for (const p of PROJECTS) {
      expect(elevation(p.x, p.y, 2, PROJECTS)).toBeGreaterThan(
        elevation(p.x, p.y, 2, []),
      );
    }
  });

  it("samples a grid and reads altitudes back", () => {
    const f = buildField(400, 200, 4, PROJECTS);
    expect(f.nx).toBe(102);
    expect(f.ny).toBe(52);
    expect(altitudeAt(f, 200, river(0.5) * 200)).toBeLessThan(200);
    expect(altitudeAt(f, -50, -50)).toBe(f.data[0]);
  });

  it("finds contour segments at levels inside the range only", () => {
    const f = buildField(200, 100, 4, PROJECTS);
    expect(contour(f, 200).length).toBeGreaterThan(0);
    expect(contour(f, 200).length % 4).toBe(0);
    expect(contour(f, 5000)).toEqual([]);
  });

  it("formats a map position around Gelnhausen", () => {
    expect(formatPosition(0, 0, 100, 100)).toBe("N 50°16.2′ E 9°1.2′");
  });
});
