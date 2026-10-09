import { berlinMonth } from "./time";

export type Season = "winter" | "spring" | "summer" | "autumn";

/** Meteorological season from the Berlin-local month: winter is December to February. */
export function seasonOf(date: Date): Season {
  const m = berlinMonth(date);
  return m <= 2 || m === 12
    ? "winter"
    : m <= 5
      ? "spring"
      : m <= 8
        ? "summer"
        : "autumn";
}

/** What the land looks like in a season. Light and day length come from the sun, not from here. */
export interface SeasonLook {
  /** Foliage in shade and in sun; in winter the colour of bare twigs. */
  leaf: string;
  leafLit: string;
  /** The wooded hills, and the patches that break them up. */
  wood: string;
  patches: string[];
  field: string;
  field2: string;
  /** Crown colours some trees take in place of leaf green (blossom, autumn colour), and the share that do. */
  accents: string[];
  accentK: number;
  /** Widest crown that takes an accent: blossom sits on small trees only. */
  accentMax: number;
  /** Daylight sky and light lean toward this colour by this share: pale and cold in winter. */
  sky: string;
  skyK: number;
  /** Share of trees drawn as bare branches. */
  bareK: number;
  /** Morning mist and chimney smoke, as multiples of summer. */
  mistAM: number;
  smoke: number;
  swifts: boolean;
}

export const SEASONS: Record<Season, SeasonLook> = {
  winter: {
    leaf: "#57504a",
    leafLit: "#857a70",
    wood: "#625850",
    patches: ["#27382d", "#2f4034", "#4a433d"],
    field: "#928974",
    field2: "#7e7564",
    accents: [],
    accentK: 0,
    bareK: 1,
    mistAM: 1.2,
    smoke: 2.2,
    swifts: false,
    accentMax: 0,
    sky: "#c4ccd2",
    skyK: 0.62,
  },
  spring: {
    leaf: "#62983c",
    leafLit: "#a8d052",
    wood: "#55843a",
    patches: ["#86ad4c", "#6f9a44"],
    field: "#8fc04c",
    field2: "#b0d45c",
    accents: ["#f6eef0", "#f2c4d2", "#f8f4ec"],
    accentK: 0.45,
    bareK: 0.12,
    mistAM: 1,
    smoke: 1,
    swifts: true,
    accentMax: 70,
    sky: "#cfe8ff",
    skyK: 0.15,
  },
  summer: {
    leaf: "#52703d",
    leafLit: "#6f8a46",
    wood: "#3f5837",
    patches: [],
    field: "#8d9a52",
    field2: "#6f8a46",
    accents: [],
    accentK: 0,
    bareK: 0,
    mistAM: 1,
    smoke: 1,
    swifts: true,
    accentMax: 0,
    sky: "#ffffff",
    skyK: 0,
  },
  autumn: {
    leaf: "#8a5a2c",
    leafLit: "#d08a2e",
    wood: "#7a5230",
    patches: ["#c0702a", "#d6a436", "#5a6a38", "#9c4226"],
    field: "#b3964e",
    field2: "#8a6a40",
    accents: ["#c8642a", "#dba632", "#a8452a", "#6f8a46"],
    accentK: 0.75,
    bareK: 0,
    mistAM: 1.7,
    smoke: 1.4,
    swifts: false,
    accentMax: 999,
    sky: "#e8dcc8",
    skyK: 0.12,
  },
};
