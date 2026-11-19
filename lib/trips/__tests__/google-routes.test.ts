import { describe, expect, it } from "vitest";
import { decodePolyline, routesRequest, seconds } from "../google-routes";

describe("Google Routes", () => {
  it("decodes Google's own polyline example", () => {
    expect(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toEqual([
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ]);
  });

  it("reads durations", () => {
    expect(seconds("1234s")).toBe(1234);
    expect(seconds("12.5s")).toBe(12.5);
    expect(seconds(undefined)).toBe(0);
  });

  it("asks through every point in order", () => {
    const body = routesRequest([
      [139.7, 35.6],
      [139.8, 35.7],
      [135.7, 35.0],
    ]);
    expect(body.origin.location.latLng).toEqual({
      latitude: 35.6,
      longitude: 139.7,
    });
    expect(body.intermediates).toHaveLength(1);
    expect(body.destination.location.latLng.longitude).toBe(135.7);
  });
});
