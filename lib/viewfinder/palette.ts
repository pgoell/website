import { mix } from "./color";

/** One light source, a tight palette per time of day. */
export interface Palette {
  skyT: string;
  skyM: string;
  skyH: string;
  sun: string;
  glowA: number;
  disc: number;
  sunX: number;
  sunY: number;
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
}

export const PALETTES = {
  night: {
    skyT: "#050914",
    skyM: "#0c1530",
    skyH: "#1d2947",
    sun: "#fff6e0",
    glowA: 0,
    disc: 0,
    sunX: 800,
    sunY: -500,
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
  },
  dawn: {
    skyT: "#262f5a",
    skyM: "#8b84ac",
    skyH: "#f4c8a3",
    sun: "#fff0cc",
    glowA: 0.95,
    disc: 1,
    sunX: 1505,
    sunY: 392,
    haze: "#d6b8ba",
    light: "#ffcf9c",
    shadow: "#4a4f7c",
    litMix: 0.36,
    shadeMix: 0.5,
    front: 0.58,
    dark: 0.1,
    flood: 0,
    win: 0.3,
    stars: 0.05,
    moon: 0,
    mist: 0.95,
    hazeK: 1,
    cloud: "#f0c0b0",
    rays: 0.8,
  },
  day9: {
    skyT: "#2e66a8",
    skyM: "#77a6d2",
    skyH: "#dce8ea",
    sun: "#fffbe8",
    glowA: 0.3,
    disc: 0,
    sunX: 1450,
    sunY: -200,
    haze: "#c3d3dc",
    light: "#fff3d8",
    shadow: "#56688b",
    litMix: 0.14,
    shadeMix: 0.38,
    front: 0.3,
    dark: 0,
    flood: 0,
    win: 0,
    stars: 0,
    moon: 0,
    mist: 0.25,
    hazeK: 0.9,
    cloud: "#ffffff",
    rays: 0,
  },
  day17: {
    skyT: "#3067a6",
    skyM: "#7ea8d0",
    skyH: "#e6e6dc",
    sun: "#fff6de",
    glowA: 0.35,
    disc: 0,
    sunX: 200,
    sunY: -150,
    haze: "#cdd6d6",
    light: "#fff0d0",
    shadow: "#56668a",
    litMix: 0.16,
    shadeMix: 0.38,
    front: 0.34,
    dark: 0,
    flood: 0,
    win: 0,
    stars: 0,
    moon: 0,
    mist: 0.15,
    hazeK: 0.9,
    cloud: "#ffffff",
    rays: 0,
  },
  gold: {
    skyT: "#2b3565",
    skyM: "#9a7a96",
    skyH: "#f7c27e",
    sun: "#ffe4a0",
    glowA: 1,
    disc: 1,
    sunX: 340,
    sunY: 548,
    haze: "#e6b08a",
    light: "#ffa850",
    shadow: "#4d3f6a",
    litMix: 0.55,
    shadeMix: 0.52,
    front: 0.48,
    dark: 0.05,
    flood: 0,
    win: 0.2,
    stars: 0,
    moon: 0,
    mist: 0.45,
    hazeK: 1,
    cloud: "#ffbe96",
    rays: 1,
  },
  blue: {
    skyT: "#0f1636",
    skyM: "#34427a",
    skyH: "#a4839f",
    sun: "#ffc0a0",
    glowA: 0.4,
    disc: 0,
    sunX: 260,
    sunY: 640,
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
  },
} satisfies Record<string, Palette>;

export type PaletteName = keyof typeof PALETTES;

/** Keyframes: hour of day to palette. Sunset sits between the Heiligenkopf domes. */
export const KEYFRAMES: ReadonlyArray<readonly [number, PaletteName]> = [
  [0, "night"],
  [5.2, "night"],
  [6.6, "dawn"],
  [9, "day9"],
  [16.6, "day17"],
  [19.1, "gold"],
  [20.4, "blue"],
  [21.7, "night"],
  [24, "night"],
];

/** Palette for a fractional hour (0 to 24), eased between the two nearest keyframes. */
export function paletteAt(hour: number): Palette {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (
    i < KEYFRAMES.length - 2 &&
    (KEYFRAMES[i + 1] as readonly [number, PaletteName])[0] <= h
  )
    i++;
  const [h0, a] = KEYFRAMES[i] as readonly [number, PaletteName];
  const [h1, b] = KEYFRAMES[i + 1] as readonly [number, PaletteName];
  let t = h1 > h0 ? Math.max(0, Math.min(1, (h - h0) / (h1 - h0))) : 0;
  t = t * t * (3 - 2 * t);
  const A: Palette = PALETTES[a];
  const B: Palette = PALETTES[b];
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
