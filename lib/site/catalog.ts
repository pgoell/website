/** The games and tools listed on their section pages, in order. */

export type CardArt = "tiles" | "dice" | "bingo" | "ring";

export interface CatalogEntry {
  /** Message key under games.* or tools.* for the title and description. */
  id: string;
  /** Path without the locale prefix. */
  path: string;
  art: CardArt;
}

export const GAMES: readonly CatalogEntry[] = [
  { id: "wordle", path: "/games/wordle", art: "tiles" },
  { id: "kniffel", path: "/games/kniffel", art: "dice" },
  { id: "bingo", path: "/games/bingo", art: "bingo" },
];

export const TOOLS: readonly CatalogEntry[] = [
  { id: "pomodoro", path: "/tools/pomodoro", art: "ring" },
];

/** Camera-style file number for the nth entry of a folder: 100-0001. */
export function fileNumber(n: number, folder = 100): string {
  return `${folder}-${String(n).padStart(4, "0")}`;
}
