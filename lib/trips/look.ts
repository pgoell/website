/** How the trip page is lit: the dark camera screen, or paper and ink. */

export const LOOKS = ["night", "day"] as const;
export type Look = (typeof LOOKS)[number];

export const DEFAULT_LOOK: Look = "night";
export const LOOK_KEY = "trips.look";

/** True for a stored value that names a look. */
export const isLook = (v: unknown): v is Look =>
  typeof v === "string" && (LOOKS as readonly string[]).includes(v);
