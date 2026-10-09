import { describe, expect, it } from "vitest";
import { conditionOf, PRESETS, parseWeather, wmo } from "../weather";
import fixture from "./fixture.json";

const current = (over: Record<string, unknown>) => ({
  current: { ...fixture.current, ...over },
});

describe("wmo", () => {
  it("reads clear and cloudy codes as no precipitation", () => {
    for (const code of [0, 1, 2, 3])
      expect(wmo(code)).toEqual({ kind: "clear", intensity: 0 });
  });
  it("reads fog", () => {
    expect(wmo(45).kind).toBe("fog");
    expect(wmo(48).kind).toBe("fog");
  });
  it("reads drizzle as faint rain", () => {
    expect(wmo(51)).toEqual({ kind: "rain", intensity: 0.15 });
    expect(wmo(55)).toEqual({ kind: "rain", intensity: 0.35 });
    expect(wmo(57).kind).toBe("rain");
  });
  it("grades rain, freezing rain and showers", () => {
    expect(wmo(61).intensity).toBe(0.4);
    expect(wmo(63).intensity).toBe(0.65);
    expect(wmo(65).intensity).toBe(0.9);
    expect(wmo(67)).toEqual({ kind: "rain", intensity: 0.8 });
    expect(wmo(80).intensity).toBe(0.5);
    expect(wmo(82)).toEqual({ kind: "rain", intensity: 1 });
  });
  it("grades snow, grains and snow showers", () => {
    expect(wmo(71)).toEqual({ kind: "snow", intensity: 0.35 });
    expect(wmo(75).intensity).toBe(0.9);
    expect(wmo(77)).toEqual({ kind: "snow", intensity: 0.25 });
    expect(wmo(86)).toEqual({ kind: "snow", intensity: 0.9 });
  });
  it("reads thunderstorms", () => {
    expect(wmo(95)).toEqual({ kind: "storm", intensity: 0.8 });
    expect(wmo(96).kind).toBe("storm");
    expect(wmo(99).intensity).toBe(1);
  });
});

describe("parseWeather", () => {
  it("parses a real answer: light rain under a closed sky", () => {
    const w = parseWeather(fixture);
    expect(w?.temperature).toBe(11);
    expect(w?.scene.kind).toBe("rain");
    expect(w?.scene.intensity).toBe(0.4);
    expect(w?.scene.cloud).toBe(1);
    expect(w?.scene.snowCover).toBe(false);
  });
  it("turns wind direction into a signed speed across the frame", () => {
    // from the south-east (144) the wind blows to the north-west, the frame's right
    expect(
      parseWeather(current({ wind_direction_10m: 144, wind_speed_10m: 20 }))
        ?.scene.wind,
    ).toBeCloseTo(20);
    expect(
      parseWeather(current({ wind_direction_10m: 324, wind_speed_10m: 20 }))
        ?.scene.wind,
    ).toBeCloseTo(-20);
    // along the camera's line of sight nothing moves sideways
    expect(
      parseWeather(current({ wind_direction_10m: 234, wind_speed_10m: 20 }))
        ?.scene.wind,
    ).toBeCloseTo(0);
  });
  it("takes cloud cover from the answer when the sky is dry", () => {
    expect(
      parseWeather(current({ weather_code: 2, cloud_cover: 40 }))?.scene.cloud,
    ).toBe(0.4);
  });
  it("closes the sky under rain even if the cover reads low", () => {
    expect(
      parseWeather(current({ weather_code: 63, cloud_cover: 20 }))?.scene.cloud,
    ).toBe(0.85);
  });
  it("sees lying snow from one centimetre", () => {
    expect(parseWeather(current({ snow_depth: 0.04 }))?.scene.snowCover).toBe(
      true,
    );
    expect(parseWeather(current({ snow_depth: null }))?.scene.snowCover).toBe(
      false,
    );
  });
  it("returns null for an answer without current values", () => {
    expect(parseWeather({ error: true, reason: "x" })).toBeNull();
    expect(parseWeather(null)).toBeNull();
    expect(parseWeather(current({ temperature_2m: undefined }))).toBeNull();
  });
});

describe("conditionOf", () => {
  it("names precipitation by kind and a dry sky by its cover", () => {
    expect(conditionOf(PRESETS.rain)).toBe("rain");
    expect(conditionOf(PRESETS.storm)).toBe("storm");
    expect(conditionOf(PRESETS.clear)).toBe("clear");
    expect(conditionOf(PRESETS.cloudy)).toBe("cloudy");
    expect(conditionOf(PRESETS.overcast)).toBe("overcast");
  });
  it("maps every preset to its own name", () => {
    for (const [name, w] of Object.entries(PRESETS))
      expect(conditionOf(w)).toBe(name);
  });
});
