import type { GameMode, GamePhase, StoredGameState } from "./types";

const STORAGE_KEY = "kniffel-state";

function isValidGameMode(m: unknown): m is GameMode {
  return typeof m === "string" && ["digital", "tracker"].includes(m);
}

function isValidGamePhase(p: unknown): p is GamePhase {
  return (
    typeof p === "string" &&
    ["mode-select", "setup", "playing", "finished"].includes(p)
  );
}

function isValidStoredGameState(data: unknown): data is StoredGameState {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;

  if (!isValidGameMode(obj.mode)) return false;
  if (!isValidGamePhase(obj.phase)) return false;
  if (!Array.isArray(obj.players)) return false;
  if (typeof obj.currentPlayerIndex !== "number") return false;
  if (typeof obj.currentTurn !== "number") return false;
  if (!Array.isArray(obj.dice)) return false;
  if (typeof obj.rollsRemaining !== "number") return false;
  if (typeof obj.hasRolled !== "boolean") return false;
  if (typeof obj.timestamp !== "number") return false;

  return true;
}

export function loadGameState(): StoredGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const data: unknown = JSON.parse(stored);
    if (!isValidStoredGameState(data)) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveGameState(state: StoredGameState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function clearGameState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
