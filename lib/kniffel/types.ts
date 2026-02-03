export type ScoreCategory =
  // Upper section
  | "ones"
  | "twos"
  | "threes"
  | "fours"
  | "fives"
  | "sixes"
  // Lower section
  | "threeOfAKind"
  | "fourOfAKind"
  | "fullHouse"
  | "smallStraight"
  | "largeStraight"
  | "kniffel"
  | "chance";

export const UPPER_CATEGORIES: ScoreCategory[] = [
  "ones",
  "twos",
  "threes",
  "fours",
  "fives",
  "sixes",
];

export const LOWER_CATEGORIES: ScoreCategory[] = [
  "threeOfAKind",
  "fourOfAKind",
  "fullHouse",
  "smallStraight",
  "largeStraight",
  "kniffel",
  "chance",
];

export const ALL_CATEGORIES: ScoreCategory[] = [
  ...UPPER_CATEGORIES,
  ...LOWER_CATEGORIES,
];

export interface DieState {
  value: number; // 1-6
  held: boolean;
}

export interface Player {
  id: string;
  name: string;
  scores: Record<ScoreCategory, number | null>;
}

export type GameMode = "digital" | "tracker";
export type GamePhase = "mode-select" | "setup" | "playing" | "finished";

export interface GameState {
  mode: GameMode | null;
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  currentTurn: number; // 1-13
  dice: DieState[];
  rollsRemaining: number; // 0-3
  hasRolled: boolean;
}

export interface StoredGameState {
  mode: GameMode;
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  currentTurn: number;
  dice: DieState[];
  rollsRemaining: number;
  hasRolled: boolean;
  timestamp: number;
}

export const TOTAL_TURNS = 13;
export const MAX_ROLLS = 3;
export const NUM_DICE = 5;
export const UPPER_BONUS_THRESHOLD = 63;
export const UPPER_BONUS_VALUE = 35;
