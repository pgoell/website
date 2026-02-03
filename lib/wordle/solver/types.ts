import type { LetterState } from "../types";

export type ConstraintState = "correct" | "present" | "absent";

export interface Constraint {
  position: number;
  letter: string;
  state: ConstraintState;
}

export interface SolverState {
  possibleWords: string[];
  constraints: Constraint[];
}

export interface ScoredWord {
  word: string;
  score: number;
  isPossibleSolution: boolean;
}

export interface FeedbackPattern {
  pattern: string; // e.g., "CGAAP" for correct/green, absent, absent, present
  count: number;
}

/**
 * Convert a LetterState to a ConstraintState (for solver compatibility)
 */
export function toConstraintState(state: LetterState): ConstraintState | null {
  if (state === "correct") return "correct";
  if (state === "present") return "present";
  if (state === "absent") return "absent";
  return null;
}
