/** What the ambient sound plays for a given sky: pure numbers, turned into Web Audio by the component layer. */

import type { SceneWeather } from "@/lib/weather/weather";
import { smoothstep } from "./color";

export type Mood = "bright" | "gray";

export interface AmbienceMix {
  /** Loudness of the soft rain loop, 0 to 1. */
  rain: number;
  /** Loudness of the heavier rain loop laid over it, 0 to 1. */
  heavy: number;
  /** Loudness of the wind loop, 0 to 1. */
  wind: number;
  /** Loudness of the birdsong loop, 0 to 1. */
  birds: number;
  /** Mean seconds between rolls of thunder; 0 for none. */
  thunder: number;
  /** Low-pass cutoff over the recordings in Hz; lower is softer. */
  muffle: number;
  /** Loudness of the slow electric piano under the weather, 0 to 1. */
  keys: number;
  /** Which chords the piano plays: major sevenths by a clear day, minor ninths otherwise. */
  mood: Mood;
  /** Snow: how often high music-box notes drift over the chords, 0 to 1. */
  sparkle: number;
  /** Fog: loudness of a low, still drone under the chords, 0 to 1. */
  drone: number;
  /** Fog: mean seconds between tolls of a far-off church bell; 0 for none. */
  bell: number;
  /** How much echo the piano and weather get, 0 to 1: wide and distant in fog, close on a dry day. */
  space: number;
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
const round = (x: number) => Math.round(x * 100) / 100;

/** The mix for a sky, with the sun's height in degrees deciding whether birds are awake. */
export function ambienceMix(
  weather: SceneWeather | null,
  sunAlt: number,
): AmbienceMix {
  const w = weather ?? CALM;
  const storm = w.kind === "storm" ? w.intensity : 0;
  const speed = Math.abs(w.wind) + storm * 25;
  const wet =
    w.kind === "rain"
      ? w.intensity
      : w.kind === "storm"
        ? 0.6 + 0.4 * w.intensity
        : 0;
  // birds sing from just before sunrise and fall quiet under a heavy sky
  const day = smoothstep(-6, 6, sunAlt);
  const birds =
    w.kind === "clear" ? day * (1 - 0.7 * smoothstep(0.3, 1, w.cloud)) : 0;
  const bright = w.kind === "clear" && w.cloud < 0.6 && day > 0.5;
  return {
    rain: round(wet > 0 ? clamp(0.35 + wet) : 0),
    heavy: round(smoothstep(0.55, 1, wet)),
    wind: round(clamp(0.12 + speed / 40)),
    birds: round(birds),
    thunder: storm > 0 ? Math.round(40 - 20 * storm) : 0,
    muffle:
      w.kind === "snow"
        ? 1800
        : w.kind === "fog"
          ? 2200
          : wet > 0
            ? 3200
            : 4200,
    keys: round((storm > 0 ? 0.35 : 0.6) * (0.75 + 0.25 * day)),
    mood: bright ? "bright" : "gray",
    sparkle: w.kind === "snow" ? round(0.4 + 0.6 * w.intensity) : 0,
    drone: w.kind === "fog" ? round(w.intensity) : 0,
    bell: w.kind === "fog" ? 35 : 0,
    space: w.kind === "fog" ? 0.7 : w.kind === "snow" ? 0.45 : 0.15,
  };
}
