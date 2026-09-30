import {
  Barlow_Condensed,
  Barlow_Semi_Condensed,
  IBM_Plex_Mono,
} from "next/font/google";

export const hudFont = Barlow_Condensed({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--vf-hud",
});

export const semiFont = Barlow_Semi_Condensed({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--vf-semi",
});

export const monoFont = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--vf-mono",
});
