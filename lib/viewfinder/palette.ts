import { mix } from "./color";

/** One light source, a tight palette per time of day. */
export interface Palette {
  skyT: string;
  skyM: string;
  skyH: string;
  sun: string;
  glowA: number;
  /** Strength of the low-sun colouring on clouds and streaks. */
  disc: number;
  haze: string;
  light: string;
  shadow: string;
  litMix: number;
  shadeMix: number;
  front: number;
  dark: number;
  flood: number;
  win: number;
  stars: number;
  moon: number;
  mist: number;
  hazeK: number;
  cloud: string;
  rays: number;
  /** Cloud deck over the glow band: body, underside lit by the low sun, opacity. */
  deck: string;
  deckLit: string;
  deckA: number;
}

export const PALETTES = {
  night: {
    skyT: "#050914",
    skyM: "#0c1530",
    skyH: "#1d2947",
    sun: "#fff6e0",
    glowA: 0,
    disc: 0,
    haze: "#18223f",
    light: "#7a88b4",
    shadow: "#0a0f22",
    litMix: 0.3,
    shadeMix: 0.72,
    front: 0.5,
    dark: 0.76,
    flood: 1,
    win: 1,
    stars: 1,
    moon: 1,
    mist: 0.45,
    hazeK: 1,
    cloud: "#18203a",
    rays: 0,
    deck: "#0b1124",
    deckLit: "#1b2444",
    deckA: 0.55,
  },
  dawn: {
    skyT: "#262f5a",
    skyM: "#8b84ac",
    skyH: "#f4c8a3",
    sun: "#fff0cc",
    glowA: 0.5,
    disc: 0,
    haze: "#d6b8ba",
    light: "#ffcf9c",
    shadow: "#4a4f7c",
    litMix: 0.36,
    shadeMix: 0.5,
    front: 0.36,
    dark: 0.1,
    flood: 0,
    win: 0.3,
    stars: 0.05,
    moon: 0,
    mist: 0.95,
    hazeK: 1,
    cloud: "#f0c0b0",
    rays: 0,
    deck: "#5d5682",
    deckLit: "#f2a58c",
    deckA: 0.7,
  },
  day: {
    skyT: "#2f67a7",
    skyM: "#7ba7d1",
    skyH: "#e1e7e3",
    sun: "#fff9e3",
    glowA: 0.32,
    disc: 0,
    haze: "#c8d5d9",
    light: "#fff2d4",
    shadow: "#56678b",
    litMix: 0.15,
    shadeMix: 0.38,
    front: 0.32,
    dark: 0,
    flood: 0,
    win: 0,
    stars: 0,
    moon: 0,
    mist: 0.2,
    hazeK: 0.9,
    cloud: "#ffffff",
    rays: 0,
    deck: "#b9c9da",
    deckLit: "#fff4e4",
    deckA: 0,
  },
  gold: {
    skyT: "#56607a",
    skyM: "#f9c050",
    skyH: "#ef8226",
    sun: "#ffe27a",
    glowA: 1,
    disc: 1,
    haze: "#a2664a",
    light: "#ff7c2c",
    shadow: "#2a1e30",
    litMix: 0.5,
    shadeMix: 0.72,
    front: 0.85,
    dark: 0.44,
    flood: 0,
    win: 0.4,
    stars: 0,
    moon: 0,
    mist: 0.5,
    hazeK: 1,
    cloud: "#5a3c44",
    rays: 0.15,
    deck: "#3a2e38",
    deckLit: "#d85c34",
    deckA: 1,
  },
  blue: {
    skyT: "#0f1636",
    skyM: "#34427a",
    skyH: "#a4839f",
    sun: "#ffc0a0",
    glowA: 0.4,
    disc: 0,
    haze: "#535c8c",
    light: "#b598b8",
    shadow: "#1a2046",
    litMix: 0.22,
    shadeMix: 0.66,
    front: 0.5,
    dark: 0.46,
    flood: 0.85,
    win: 0.85,
    stars: 0.35,
    moon: 0.5,
    mist: 0.45,
    hazeK: 1,
    cloud: "#645a84",
    rays: 0,
    deck: "#171a36",
    deckLit: "#6e4668",
    deckA: 0.9,
  },
} satisfies Record<string, Palette>;

export type PaletteName = keyof typeof PALETTES;

/** Stops by solar altitude in degrees. Evening passes through the sunset look, morning through dawn, where the sun is behind the viewer. */
const STOPS = (
  rising: boolean,
): ReadonlyArray<readonly [number, PaletteName]> => [
  [-9, "night"],
  [-5, "blue"],
  [0.4, rising ? "dawn" : "gold"],
  [12, "day"],
];

/** Palette for a solar altitude, eased between the two nearest stops. June nights at this latitude bottom out near -16 degrees, so night starts early. */
export function paletteFor(alt: number, rising: boolean): Palette {
  const stops = STOPS(rising);
  let i = 0;
  while (
    i < stops.length - 2 &&
    (stops[i + 1] as readonly [number, PaletteName])[0] <= alt
  )
    i++;
  const [a0, a] = stops[i] as readonly [number, PaletteName];
  const [a1, b] = stops[i + 1] as readonly [number, PaletteName];
  let t = Math.max(0, Math.min(1, (alt - a0) / (a1 - a0)));
  t = t * t * (3 - 2 * t);
  const A: Palette = PALETTES[a];
  const B: Palette = PALETTES[b];
  if (t <= 0) return A;
  if (t >= 1) return B;
  const out = {} as Record<string, number | string>;
  for (const k of Object.keys(A) as (keyof Palette)[]) {
    const va = A[k];
    const vb = B[k];
    out[k] =
      typeof va === "number"
        ? va + ((vb as number) - va) * t
        : mix(va, vb as string, t);
  }
  return out as unknown as Palette;
}
