"use client";

import { useMemo } from "react";
import type { TileData } from "@/lib/wordle";
import {
  type Constraint,
  createSolverState,
  getBestOpeners,
  getRankedGuesses,
  type ScoredWord,
  type SolverState,
  updateSolverState,
} from "@/lib/wordle/solver";

interface UseSolverOptions {
  wordList: string[];
  guesses: string[];
  solution: string;
  enabled?: boolean;
}

interface UseSolverReturn {
  suggestions: ScoredWord[];
  possibleWordsCount: number;
  solverState: SolverState;
}

/**
 * Hook for getting solver suggestions based on current game state
 */
export function useSolver({
  wordList,
  guesses,
  solution,
  enabled = true,
}: UseSolverOptions): UseSolverReturn {
  // Build solver state from guesses (only when enabled)
  const solverState = useMemo(() => {
    if (!enabled) {
      return { possibleWords: [], constraints: [] };
    }

    let state = createSolverState(wordList);

    for (const guess of guesses) {
      const pattern = getPatternFromGuess(guess, solution);
      state = updateSolverState(state, guess, pattern);
    }

    return state;
  }, [wordList, guesses, solution, enabled]);

  // Get ranked suggestions (only when enabled)
  const suggestions = useMemo(() => {
    if (!enabled) {
      return [];
    }
    // Use pre-computed openers for first guess (instant)
    if (guesses.length === 0) {
      return getBestOpeners(wordList);
    }
    return getRankedGuesses(solverState, wordList, 5);
  }, [solverState, wordList, enabled, guesses.length]);

  return {
    suggestions,
    possibleWordsCount: solverState.possibleWords.length,
    solverState,
  };
}

/**
 * Get the feedback pattern for a guess against the solution
 */
function getPatternFromGuess(guess: string, solution: string): string {
  const guessLetters = guess.toUpperCase().split("");
  const solutionLetters = solution.toUpperCase().split("");
  const result: string[] = new Array(guessLetters.length).fill("A");

  const solutionUsed: boolean[] = new Array(solutionLetters.length).fill(false);

  // First pass: exact matches
  for (let i = 0; i < guessLetters.length; i++) {
    if (guessLetters[i] === solutionLetters[i]) {
      result[i] = "C";
      solutionUsed[i] = true;
    }
  }

  // Second pass: present letters
  for (let i = 0; i < guessLetters.length; i++) {
    if (result[i] === "C") continue;

    const letter = guessLetters[i];
    for (let j = 0; j < solutionLetters.length; j++) {
      if (!solutionUsed[j] && solutionLetters[j] === letter) {
        result[i] = "P";
        solutionUsed[j] = true;
        break;
      }
    }
  }

  return result.join("");
}

/**
 * Convert board tiles to constraints for external solver use
 */
export function tilesToConstraints(
  guess: string,
  tiles: TileData[],
): Constraint[] {
  const constraints: Constraint[] = [];
  const letters = guess.toUpperCase().split("");

  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    const tile = tiles[i];
    if (!letter || !tile) continue;

    if (tile.state === "correct") {
      constraints.push({ position: i, letter, state: "correct" });
    } else if (tile.state === "present") {
      constraints.push({ position: i, letter, state: "present" });
    } else if (tile.state === "absent") {
      constraints.push({ position: i, letter, state: "absent" });
    }
  }

  return constraints;
}
