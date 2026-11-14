import { expect, test } from "vitest";
import {
  hours,
  insertPoint,
  km,
  missingRuns,
  pathOf,
  type Road,
  removePoint,
  roadKey,
  setWay,
  stretchesOf,
  wayOf,
} from "../route";
import type { DrawnPoint, LngLat } from "../types";

const A: LngLat = [36, -3];
const B: LngLat = [36.1, -3];
const C: LngLat = [36.2, -3];
const D: LngLat = [36.3, -3];
const road = (a: LngLat, b: LngLat): [string, Road] => [
  roadKey(a, b),
  { line: [[(a[0] + b[0]) / 2, -3.01]], m: 12_000, s: 600 },
];

test("a road that is not known yet waits, one the router lacks is none", () => {
  const points: DrawnPoint[] = [
    { at: A, road: false },
    { at: B, road: true },
    { at: C, road: true },
  ];
  const roads = new Map<string, Road | null>([[roadKey(B, C), null]]);
  expect(stretchesOf(points, roads).map((s) => s.kind)).toEqual([
    "wait",
    "none",
  ]);
  expect(pathOf(points, roads)).toBeNull();
});

test("the path runs through every point and along each stretch", () => {
  const points: DrawnPoint[] = [
    { at: A, road: false },
    { at: B, road: true },
    { at: C, road: false },
    { at: D, road: false, line: [[36.25, -3.02]] },
  ];
  const roads = new Map([road(A, B)]);
  expect(pathOf(points, roads)).toEqual([
    A,
    [36.05, -3.01],
    B,
    C,
    [36.25, -3.02],
    D,
  ]);
  expect(points.map(wayOf)).toEqual(["straight", "road", "straight", "free"]);
});

test("roads in a row are asked for as one run, known ones not at all", () => {
  const points: DrawnPoint[] = [
    { at: A, road: false },
    { at: B, road: true },
    { at: C, road: true },
    { at: D, road: false },
  ];
  expect(missingRuns(points, new Map())).toEqual([[A, B, C]]);
  expect(missingRuns(points, new Map([road(A, B), road(B, C)]))).toEqual([]);
});

test("a new point takes the way of the stretch it lands on", () => {
  const points: DrawnPoint[] = [
    { at: A, road: false },
    { at: C, road: true },
  ];
  expect(insertPoint(points, 1, B)).toEqual([
    { at: A, road: false },
    { at: B, road: true },
    { at: C, road: true },
  ]);
});

test("a new point cuts a line drawn by hand in two", () => {
  const line: LngLat[] = [
    [36.02, -3],
    [36.05, -3],
    [36.08, -3],
  ];
  const points: DrawnPoint[] = [
    { at: A, road: false },
    { at: B, road: false, line },
  ];
  const [, mid, end] = insertPoint(points, 1, [36.05, -3.001]);
  expect(mid?.line).toEqual([[36.02, -3]]);
  expect(end?.line).toEqual([[36.08, -3]]);
});

test("the last two points cannot be removed", () => {
  const points: DrawnPoint[] = [
    { at: A, road: false },
    { at: B, road: true },
    { at: C, road: true },
  ];
  expect(removePoint(points, 1).map((p) => p.at)).toEqual([A, C]);
  expect(removePoint(removePoint(points, 1), 0)).toHaveLength(2);
});

test("a stretch set back to road forgets its drawn line", () => {
  const points: DrawnPoint[] = [
    { at: A, road: false },
    { at: B, road: false, line: [[36.05, -3.01]] },
  ];
  expect(setWay(points, 1, "road")[1]).toEqual({ at: B, road: true });
});

test("lengths and times read short", () => {
  expect(km(152_400)).toBe("152 km");
  expect(km(8_240)).toBe("8.2 km");
  expect(km(432)).toBe("430 m");
  expect(km(8_240, "de")).toBe("8,2 km");
  expect(hours(9_900)).toBe("2 h 45");
  expect(hours(2_100)).toBe("35 min");
});
