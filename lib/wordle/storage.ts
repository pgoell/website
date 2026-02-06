import type { GameState, StoredGameState } from "./types";

const STORAGE_KEY_PREFIX = "wordle-state-";

function getStorageKey(locale: string): string {
  return `${STORAGE_KEY_PREFIX}${locale}`;
}

function isValidLetterState(s: unknown): boolean {
  return s === "correct" || s === "present" || s === "absent";
}

function isValidGameStatus(s: unknown): boolean {
  return s === "playing" || s === "won" || s === "lost";
}

function isValidStoredGameState(data: unknown): data is StoredGameState {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.solution !== "string") return false;
  if (
    !Array.isArray(obj.guesses) ||
    !obj.guesses.every((g: unknown) => typeof g === "string")
  )
    return false;
  if (!isValidGameStatus(obj.gameStatus)) return false;

  const letterStates = obj.letterStates;
  if (typeof letterStates !== "object" || letterStates === null) return false;
  for (const value of Object.values(letterStates as Record<string, unknown>)) {
    if (!isValidLetterState(value)) return false;
  }

  if (typeof obj.locale !== "string") return false;
  if (typeof obj.timestamp !== "number") return false;

  return true;
}

export function loadGameState(locale: string): StoredGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(getStorageKey(locale));
    if (!stored) return null;
    const data: unknown = JSON.parse(stored);
    if (!isValidStoredGameState(data)) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveGameState(state: GameState, locale: string): void {
  if (typeof window === "undefined") return;
  try {
    const toStore: StoredGameState = {
      solution: state.solution,
      guesses: state.guesses,
      gameStatus: state.gameStatus,
      letterStates: state.letterStates,
      locale,
      timestamp: Date.now(),
    };
    localStorage.setItem(getStorageKey(locale), JSON.stringify(toStore));
  } catch {
    // Ignore storage errors
  }
}

export function clearGameState(locale: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getStorageKey(locale));
  } catch {
    // Ignore storage errors
  }
}
