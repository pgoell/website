export type LetterState = "correct" | "present" | "absent" | "empty" | "tbd";

export interface TileData {
  letter: string;
  state: LetterState;
}

export interface GameState {
  solution: string;
  guesses: string[];
  currentGuess: string;
  gameStatus: "playing" | "won" | "lost";
  letterStates: Record<string, LetterState>;
}

export interface StoredGameState {
  solution: string;
  guesses: string[];
  gameStatus: "playing" | "won" | "lost";
  letterStates: Record<string, LetterState>;
  locale: string;
  timestamp: number;
}
