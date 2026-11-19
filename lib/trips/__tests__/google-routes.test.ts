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

describe("directions link", () => {
  it("names the place when Google knows it", async () => {
    const { directionsLink, NO_GOOGLE } = await import("../places");
    expect(directionsLink({ lat: 35.71, lng: 139.79 })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=35.71,139.79",
    );
    expect(
      directionsLink({ lat: 35.71, lng: 139.79, googlePlaceId: "ChIJ x" }),
    ).toContain("&destination_place_id=ChIJ%20x");
    expect(
      directionsLink({ lat: 1, lng: 2, googlePlaceId: NO_GOOGLE }),
    ).not.toContain("place_id");
  });
});
