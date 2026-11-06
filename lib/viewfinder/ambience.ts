/** What the ambient sound plays for a given sky: pure numbers, turned into Web Audio by the component layer. */

import type { SceneWeather } from "@/lib/weather/weather";
import { smoothstep } from "./color";

export interface AmbienceMix {
  /** Loudness of the wind bed, 0 to 1. */
  wind: number;
  /** Centre of the wind's noise band in Hz; stronger wind whistles higher. */
  windTone: number;
  /** Loudness of the rain hiss, 0 to 1. */
  rain: number;
  /** Single drops on roofs and gutters, per second. */
  drops: number;
  /** Mean seconds between claps of thunder; 0 for none. */
  thunder: number;
  /** How often birds call, 0 to 1. */
  birds: number;
  /** Low-pass cutoff over everything in Hz: snow and fog deaden the air. */
  muffle: number;
}

/** The calm default the scene shows when it has no weather. */
const CALM: SceneWeather = {
  cloud: 0,
  kind: "clear",
  intensity: 0,
  wind: 4,
  snowCover: false,
};

const clamp = (x: number) => Math.max(0, Math.min(1, x));

/** The mix for a sky, with the sun's height in degrees deciding whether birds are awake. */
export function ambienceMix(
  weather: SceneWeather | null,
  sunAlt: number,
): AmbienceMix {
  const w = weather ?? CALM;
  const storm = w.kind === "storm" ? w.intensity : 0;
  const speed = Math.abs(w.wind) + storm * 25;
  const rain =
    w.kind === "rain"
      ? w.intensity
      : w.kind === "storm"
        ? 0.6 + 0.4 * w.intensity
        : 0;
  // birds sing from just before sunrise and fall quiet under a heavy sky
  const day = smoothstep(-6, 6, sunAlt);
  const birds =
    w.kind === "clear" ? day * (1 - 0.7 * smoothstep(0.3, 1, w.cloud)) : 0;
  return {
    wind: clamp(0.08 + speed / 45),
    windTone: Math.round(260 + Math.min(speed, 60) * 14),
    rain,
    drops: Math.round(rain * 24 * 10) / 10,
    thunder: storm > 0 ? Math.round(32 - 20 * storm) : 0,
    birds: Math.round(birds * 100) / 100,
    muffle: w.kind === "snow" ? 900 : w.kind === "fog" ? 1600 : 9000,
  };
}
