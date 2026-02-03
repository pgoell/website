import type { Constraint, ConstraintState } from "./types";

/**
 * Generate the feedback pattern for a guess against a solution
 * Returns a string like "CAPPA" where C=correct, P=present, A=absent
 */
export function getFeedbackPattern(guess: string, solution: string): string {
  const guessLetters = guess.toUpperCase().split("");
  const solutionLetters = solution.toUpperCase().split("");
  const result: ConstraintState[] = new Array(guessLetters.length).fill(
    "absent",
  );

  // Track which solution letters have been matched
  const solutionUsed: boolean[] = new Array(solutionLetters.length).fill(false);

  // First pass: find exact matches (correct)
  for (let i = 0; i < guessLetters.length; i++) {
    if (guessLetters[i] === solutionLetters[i]) {
      result[i] = "correct";
      solutionUsed[i] = true;
    }
  }

  // Second pass: find present letters (wrong position)
  for (let i = 0; i < guessLetters.length; i++) {
    if (result[i] === "correct") continue;

    const letter = guessLetters[i];
    if (letter === undefined) continue;

    for (let j = 0; j < solutionLetters.length; j++) {
      if (!solutionUsed[j] && solutionLetters[j] === letter) {
        result[i] = "present";
        solutionUsed[j] = true;
        break;
      }
    }
  }

  // Convert to pattern string
  return result
    .map((s) => {
      if (s === "correct") return "C";
      if (s === "present") return "P";
      return "A";
    })
    .join("");
}

/**
 * Convert a feedback pattern string to constraints
 */
export function patternToConstraints(
  guess: string,
  pattern: string,
): Constraint[] {
  const constraints: Constraint[] = [];
  const letters = guess.toUpperCase().split("");

  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    const p = pattern[i];
    if (!letter || !p) continue;

    let state: ConstraintState;
    if (p === "C") state = "correct";
    else if (p === "P") state = "present";
    else state = "absent";

    constraints.push({ position: i, letter, state });
  }

  return constraints;
}

/**
 * Check if a word satisfies all constraints
 */
export function wordMatchesConstraints(
  word: string,
  constraints: Constraint[],
): boolean {
  const wordUpper = word.toUpperCase();
  const letters = wordUpper.split("");

  // Group constraints by type for efficient checking
  const correctPositions = new Map<number, string>();
  const presentLetters: Array<{ letter: string; notAtPosition: number }> = [];
  const absentLetters = new Set<string>();
  const letterMinCounts = new Map<string, number>();

  // Process constraints
  for (const c of constraints) {
    if (c.state === "correct") {
      correctPositions.set(c.position, c.letter);
      letterMinCounts.set(c.letter, (letterMinCounts.get(c.letter) ?? 0) + 1);
    } else if (c.state === "present") {
      presentLetters.push({ letter: c.letter, notAtPosition: c.position });
      letterMinCounts.set(c.letter, (letterMinCounts.get(c.letter) ?? 0) + 1);
    } else if (c.state === "absent") {
      // Only truly absent if no correct/present for this letter exists
      absentLetters.add(c.letter);
    }
  }

  // Check correct positions
  for (const [pos, letter] of correctPositions) {
    if (letters[pos] !== letter) return false;
  }

  // Check present letters (must exist but not at that position)
  for (const { letter, notAtPosition } of presentLetters) {
    if (letters[notAtPosition] === letter) return false;
    if (!wordUpper.includes(letter)) return false;
  }

  // Check absent letters
  // A letter is truly absent only if it doesn't appear as correct/present
  for (const letter of absentLetters) {
    const minCount = letterMinCounts.get(letter) ?? 0;
    const actualCount = wordUpper.split(letter).length - 1;

    // If we know the exact count from correct+present, actual must match
    if (minCount > 0) {
      if (actualCount !== minCount) return false;
    } else {
      // Letter should not appear at all
      if (actualCount > 0) return false;
    }
  }

  // Check minimum letter counts
  for (const [letter, minCount] of letterMinCounts) {
    const actualCount = wordUpper.split(letter).length - 1;
    if (actualCount < minCount) return false;
  }

  return true;
}

/**
 * Filter a list of words by accumulated constraints
 */
export function filterByConstraints(
  words: string[],
  constraints: Constraint[],
): string[] {
  if (constraints.length === 0) return words;
  return words.filter((word) => wordMatchesConstraints(word, constraints));
}
