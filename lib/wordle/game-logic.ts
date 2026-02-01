import type { LetterState, TileData } from "./types";

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

/**
 * Pick a random word from the list
 */
export function getRandomWord(words: string[]): string {
  if (words.length === 0) {
    throw new Error("Word list is empty");
  }
  const index = Math.floor(Math.random() * words.length);
  const word = words[index];
  if (!word) {
    throw new Error("Failed to pick a word");
  }
  return word;
}

/**
 * Evaluate a guess against the solution
 * Returns an array of TileData with letter states
 */
export function evaluateGuess(guess: string, solution: string): TileData[] {
  const guessLetters = guess.toUpperCase().split("");
  const solutionLetters = solution.toUpperCase().split("");
  const result: TileData[] = [];

  // Track which solution letters have been matched
  const solutionUsed: boolean[] = new Array(solutionLetters.length).fill(false);

  // First pass: find exact matches (correct)
  for (let i = 0; i < guessLetters.length; i++) {
    const letter = guessLetters[i];
    if (letter === undefined) continue;

    if (letter === solutionLetters[i]) {
      result[i] = { letter, state: "correct" };
      solutionUsed[i] = true;
    } else {
      result[i] = { letter, state: "absent" };
    }
  }

  // Second pass: find present letters (wrong position)
  for (let i = 0; i < guessLetters.length; i++) {
    const tile = result[i];
    if (!tile || tile.state === "correct") continue;

    const letter = guessLetters[i];
    if (letter === undefined) continue;

    // Look for an unused match in the solution
    for (let j = 0; j < solutionLetters.length; j++) {
      if (!solutionUsed[j] && solutionLetters[j] === letter) {
        result[i] = { letter, state: "present" };
        solutionUsed[j] = true;
        break;
      }
    }
  }

  return result;
}

/**
 * Update the keyboard letter states based on a guess evaluation
 * Only upgrades states (absent -> present -> correct)
 */
export function updateLetterStates(
  currentStates: Record<string, LetterState>,
  evaluation: TileData[],
): Record<string, LetterState> {
  const newStates = { ...currentStates };

  const priority: Record<LetterState, number> = {
    empty: 0,
    tbd: 1,
    absent: 2,
    present: 3,
    correct: 4,
  };

  for (const tile of evaluation) {
    const currentState = newStates[tile.letter] ?? "empty";
    const currentPriority = priority[currentState];
    const newPriority = priority[tile.state];

    if (newPriority > currentPriority) {
      newStates[tile.letter] = tile.state;
    }
  }

  return newStates;
}

/**
 * Check if a word is valid (in the word list)
 */
export function isValidWord(word: string, validWords: Set<string>): boolean {
  return validWords.has(word.toUpperCase());
}

/**
 * Create an empty row of tiles
 */
export function createEmptyRow(): TileData[] {
  return Array.from({ length: WORD_LENGTH }, () => ({
    letter: "",
    state: "empty" as const,
  }));
}

/**
 * Create a row from the current guess (not yet submitted)
 */
export function createCurrentRow(currentGuess: string): TileData[] {
  const tiles: TileData[] = [];
  for (let i = 0; i < WORD_LENGTH; i++) {
    const letter = currentGuess[i] ?? "";
    tiles.push({
      letter,
      state: letter ? "tbd" : "empty",
    });
  }
  return tiles;
}
