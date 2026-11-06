import { describe, expect, it } from "vitest";
import { PRESETS } from "@/lib/weather/weather";
import { ambienceMix } from "../ambience";

const NOON = 40;
const NIGHT = -30;

describe("ambienceMix", () => {
  it("plays a soft breeze, birds and bright chords on a calm clear day", () => {
    const m = ambienceMix(null, NOON);
    expect(m.wind).toBeGreaterThan(0);
    expect(m.wind).toBeLessThan(0.3);
    expect(m.rain).toBe(0);
    expect(m.thunder).toBe(0);
    expect(m.birds).toBe(1);
    expect(m.mood).toBe("bright");
  });

  it("keeps the birds asleep and the chords gray at night", () => {
    const m = ambienceMix(PRESETS.clear, NIGHT);
    expect(m.birds).toBe(0);
    expect(m.mood).toBe("gray");
    expect(m.keys).toBeLessThan(ambienceMix(PRESETS.clear, NOON).keys);
  });

  it("thins the birds under a closed sky", () => {
    const clear = ambienceMix(PRESETS.clear, NOON).birds;
    const overcast = ambienceMix(PRESETS.overcast, NOON).birds;
    expect(overcast).toBeLessThan(clear);
    expect(overcast).toBeGreaterThan(0);
  });

  it("plays soft rain for rain and adds the heavy loop only when it pours", () => {
    const drizzle = ambienceMix({ ...PRESETS.rain, intensity: 0.15 }, NOON);
    expect(drizzle.rain).toBeGreaterThan(0);
    expect(drizzle.heavy).toBe(0);
    const pour = ambienceMix({ ...PRESETS.rain, intensity: 1 }, NOON);
    expect(pour.heavy).toBe(1);
    expect(pour.birds).toBe(0);
    expect(pour.mood).toBe("gray");
  });

  it("brings thunder, heavy rain and strong wind in a storm, and steps the piano back", () => {
    const m = ambienceMix(PRESETS.storm, NOON);
    const rain = ambienceMix(PRESETS.rain, NOON);
    expect(m.thunder).toBeGreaterThan(0);
    expect(m.heavy).toBeGreaterThan(rain.heavy);
    expect(m.wind).toBeGreaterThan(rain.wind);
    expect(m.keys).toBeLessThan(rain.keys);
  });

  it("muffles snow and fog more than rain, and rain more than a dry day", () => {
    const at = (p: keyof typeof PRESETS) =>
      ambienceMix(PRESETS[p], NOON).muffle;
    expect(at("snow")).toBeLessThan(at("rain"));
    expect(at("fog")).toBeLessThan(at("rain"));
    expect(at("rain")).toBeLessThan(at("clear"));
  });

  it("treats wind from either side the same", () => {
    const left = ambienceMix({ ...PRESETS.cloudy, wind: -20 }, NOON);
    const right = ambienceMix({ ...PRESETS.cloudy, wind: 20 }, NOON);
    expect(left.wind).toBe(right.wind);
  });

  it("keeps every level within 0 to 1", () => {
    for (const p of Object.values(PRESETS)) {
      const m = ambienceMix({ ...p, wind: 200 }, NOON);
      for (const v of [m.wind, m.rain, m.heavy, m.birds, m.keys]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
