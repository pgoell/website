/** Live weather over Gelnhausen from Open-Meteo, reduced to what the home page scene and its readout need. */

const URL =
  "https://api.open-meteo.com/v1/forecast?latitude=50.2&longitude=9.19&current=temperature_2m,cloud_cover,weather_code,precipitation,rain,snowfall,snow_depth,wind_speed_10m,wind_direction_10m&timezone=Europe%2FBerlin";
const HALF_HOUR = 1800;
/** Compass bearing of the scene's right-hand side; the camera looks along 234. */
const FRAME_RIGHT = 324;

export type WeatherKind = "clear" | "rain" | "snow" | "fog" | "storm";

export interface SceneWeather {
  /** Cloud cover, 0 to 1. */
  cloud: number;
  kind: WeatherKind;
  /** Strength of rain, snow, fog or storm, 0 to 1; 0 when clear. */
  intensity: number;
  /** Wind across the frame in km/h, positive when it blows from left to right. */
  wind: number;
  /** Snow lies on the ground. */
  snowCover: boolean;
}

export interface Weather {
  /** Degrees Celsius. */
  temperature: number;
  scene: SceneWeather;
}

export type Condition = WeatherKind | "cloudy" | "overcast";

interface Current {
  temperature_2m: number;
  cloud_cover: number;
  weather_code: number;
  snow_depth?: number | null;
  wind_speed_10m: number;
  wind_direction_10m: number;
}

/** WMO weather code to kind and intensity. */
export function wmo(code: number): Pick<SceneWeather, "kind" | "intensity"> {
  const pick = (kind: WeatherKind, steps: number[], from: number, by = 1) => ({
    kind,
    intensity:
      steps[Math.min(steps.length - 1, Math.floor((code - from) / by))] ?? 0,
  });
  if (code === 45 || code === 48) return { kind: "fog", intensity: 0.8 };
  if (code >= 51 && code <= 57) return pick("rain", [0.15, 0.25, 0.35], 51, 2);
  if (code >= 61 && code <= 65) return pick("rain", [0.4, 0.65, 0.9], 61, 2);
  if (code === 66 || code === 67) return pick("rain", [0.4, 0.8], 66);
  if (code >= 71 && code <= 75) return pick("snow", [0.35, 0.6, 0.9], 71, 2);
  if (code === 77) return { kind: "snow", intensity: 0.25 };
  if (code >= 80 && code <= 82) return pick("rain", [0.5, 0.75, 1], 80);
  if (code === 85 || code === 86) return pick("snow", [0.5, 0.9], 85);
  if (code === 95) return { kind: "storm", intensity: 0.8 };
  if (code === 96 || code === 99) return { kind: "storm", intensity: 1 };
  return { kind: "clear", intensity: 0 };
}

/** Parses an Open-Meteo answer; null when it does not carry current values. */
export function parseWeather(json: unknown): Weather | null {
  const cur = (json as { current?: Partial<Current> } | null)?.current;
  if (
    typeof cur?.temperature_2m !== "number" ||
    typeof cur.cloud_cover !== "number" ||
    typeof cur.weather_code !== "number" ||
    typeof cur.wind_speed_10m !== "number" ||
    typeof cur.wind_direction_10m !== "number"
  )
    return null;
  const { kind, intensity } = wmo(cur.weather_code);
  // the direction is where the wind comes from
  const toward = ((cur.wind_direction_10m + 180 - FRAME_RIGHT) * Math.PI) / 180;
  // rain and snow fall from a closed sky, and fog hides the sky
  const floor = kind === "clear" ? 0 : kind === "fog" ? 1 : 0.85;
  return {
    temperature: cur.temperature_2m,
    scene: {
      cloud: Math.max(floor, Math.min(1, cur.cloud_cover / 100)),
      kind,
      intensity,
      wind: Math.cos(toward) * cur.wind_speed_10m,
      snowCover: (cur.snow_depth ?? 0) >= 0.01,
    },
  };
}

/** The word the readout shows. */
export function conditionOf(w: SceneWeather): Condition {
  if (w.kind !== "clear") return w.kind;
  return w.cloud > 0.85 ? "overcast" : w.cloud > 0.3 ? "cloudy" : "clear";
}

/** Fixed states for review with `?weather=`. */
export const PRESETS: Record<Condition, SceneWeather> = {
  clear: {
    cloud: 0.05,
    kind: "clear",
    intensity: 0,
    wind: 6,
    snowCover: false,
  },
  cloudy: {
    cloud: 0.55,
    kind: "clear",
    intensity: 0,
    wind: 12,
    snowCover: false,
  },
  overcast: {
    cloud: 1,
    kind: "clear",
    intensity: 0,
    wind: 8,
    snowCover: false,
  },
  rain: { cloud: 1, kind: "rain", intensity: 0.65, wind: 14, snowCover: false },
  snow: { cloud: 1, kind: "snow", intensity: 0.6, wind: -8, snowCover: true },
  fog: { cloud: 1, kind: "fog", intensity: 0.8, wind: 2, snowCover: false },
  storm: {
    cloud: 1,
    kind: "storm",
    intensity: 0.9,
    wind: 30,
    snowCover: false,
  },
};

/** Null when Open-Meteo fails; the scene then keeps its calm default and the readout shows a dash. */
export async function getWeather(): Promise<Weather | null> {
  try {
    const res = await fetch(URL, { next: { revalidate: HALF_HOUR } });
    return res.ok ? parseWeather(await res.json()) : null;
  } catch {
    return null;
  }
}
