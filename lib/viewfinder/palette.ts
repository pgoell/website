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
    deck: "#0b1124",
    deckLit: "#1b2444",
    deckA: 0.55,
  },
  dawn: {
    skyT: "#262f5a",
    skyM: "#8b84ac",
    skyH: "#f4c8a3",
    sun: "#fff0cc",
    glowA: 0.95,
    disc: 1,
    sunX: 110,
    sunY: 556,
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
    deck: "#5d5682",
    deckLit: "#f2a58c",
    deckA: 0.7,
  },
  day9: {
    skyT: "#2e66a8",
    skyM: "#77a6d2",
    skyH: "#dce8ea",
    sun: "#fffbe8",
    glowA: 0.3,
    disc: 0,
    sunX: 250,
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
    deck: "#b9c9da",
    deckLit: "#ffffff",
    deckA: 0,
  },
  day17: {
    skyT: "#3067a6",
    skyM: "#7ea8d0",
    skyH: "#e6e6dc",
    sun: "#fff6de",
    glowA: 0.35,
    disc: 0,
    sunX: 1400,
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
    deck: "#b9c9da",
    deckLit: "#ffe9c8",
    deckA: 0,
  },
  gold: {
    skyT: "#56607a",
    skyM: "#f9c050",
    skyH: "#ef8226",
    sun: "#ffe27a",
    glowA: 1,
    disc: 1,
    sunX: 1525,
    sunY: 580,
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
    sunX: 1560,
    sunY: 690,
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

/** Keyframes: hour of day to palette. Sunrise is behind the hills at far left, sunset on the horizon at far right. */
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
