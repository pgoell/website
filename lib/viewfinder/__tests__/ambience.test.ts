import { describe, expect, it } from "vitest";
import { PRESETS } from "@/lib/weather/weather";
import { ambienceMix } from "../ambience";

const NOON = 40;
const NIGHT = -30;

describe("ambienceMix", () => {
  it("plays a soft breeze and birds on a calm clear day", () => {
    const m = ambienceMix(null, NOON);
    expect(m.wind).toBeGreaterThan(0);
    expect(m.wind).toBeLessThan(0.3);
    expect(m.rain).toBe(0);
    expect(m.thunder).toBe(0);
    expect(m.birds).toBe(1);
  });

  it("keeps the birds asleep at night", () => {
    expect(ambienceMix(PRESETS.clear, NIGHT).birds).toBe(0);
  });

  it("thins the birds under a closed sky", () => {
    const clear = ambienceMix(PRESETS.clear, NOON).birds;
    const overcast = ambienceMix(PRESETS.overcast, NOON).birds;
    expect(overcast).toBeLessThan(clear);
    expect(overcast).toBeGreaterThan(0);
  });

  it("follows rain intensity with hiss and drops", () => {
    const m = ambienceMix(PRESETS.rain, NOON);
    expect(m.rain).toBe(PRESETS.rain.intensity);
    expect(m.drops).toBeGreaterThan(10);
    expect(m.birds).toBe(0);
    expect(m.thunder).toBe(0);
  });

  it("brings thunder, heavy rain and strong wind in a storm", () => {
    const m = ambienceMix(PRESETS.storm, NOON);
    const rain = ambienceMix(PRESETS.rain, NOON);
    expect(m.thunder).toBeGreaterThan(0);
    expect(m.rain).toBeGreaterThan(rain.rain);
    expect(m.wind).toBeGreaterThan(rain.wind);
    expect(m.windTone).toBeGreaterThan(rain.windTone);
  });

  it("muffles snow and fog", () => {
    expect(ambienceMix(PRESETS.snow, NOON).muffle).toBeLessThan(2000);
    expect(ambienceMix(PRESETS.fog, NOON).muffle).toBeLessThan(2000);
    expect(ambienceMix(PRESETS.clear, NOON).muffle).toBeGreaterThan(5000);
  });

  it("treats wind from either side the same", () => {
    const left = ambienceMix({ ...PRESETS.cloudy, wind: -20 }, NOON);
    const right = ambienceMix({ ...PRESETS.cloudy, wind: 20 }, NOON);
    expect(left.wind).toBe(right.wind);
  });

  it("keeps every level within 0 to 1", () => {
    for (const p of Object.values(PRESETS)) {
      const m = ambienceMix({ ...p, wind: 200 }, NOON);
      for (const v of [m.wind, m.rain, m.birds]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
