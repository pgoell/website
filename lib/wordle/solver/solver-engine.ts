import type { Constraint, ScoredWord, SolverState } from "./types";
import { filterByConstraints, getFeedbackPattern } from "./word-filter";

// Pre-computed best opening words (high entropy starters)
const BEST_OPENERS_EN = ["SALET", "REAST", "CRATE", "TRACE", "SLATE", "CRANE"];
const BEST_OPENERS_DE = ["STEIN", "REIST", "ERNST", "STERN", "RATEN", "SAITE"];

/**
 * Calculate letter frequency scores for remaining words
 * Returns map of letter -> frequency (0-1) and position frequency
 */
function calculateLetterFrequencies(words: string[]): {
  letterFreq: Map<string, number>;
  positionFreq: Map<string, number>;
} {
  const letterCounts = new Map<string, number>();
  const positionCounts = new Map<string, number>();
  const totalWords = words.length;

  for (const word of words) {
    const seen = new Set<string>();
    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      if (!letter) continue;
      // Count each letter once per word for frequency
      if (!seen.has(letter)) {
        letterCounts.set(letter, (letterCounts.get(letter) ?? 0) + 1);
        seen.add(letter);
      }
      // Count position-specific frequency
      const posKey = `${letter}:${i}`;
      positionCounts.set(posKey, (positionCounts.get(posKey) ?? 0) + 1);
    }
  }

  // Normalize to 0-1
  const letterFreq = new Map<string, number>();
  const positionFreq = new Map<string, number>();

  for (const [letter, count] of letterCounts) {
    letterFreq.set(letter, count / totalWords);
  }
  for (const [key, count] of positionCounts) {
    positionFreq.set(key, count / totalWords);
  }

  return { letterFreq, positionFreq };
}

/**
 * Fast scoring using letter frequency heuristic
 * Prefers words with common letters in common positions, penalizes duplicates
 */
function calculateFrequencyScore(
  word: string,
  letterFreq: Map<string, number>,
  positionFreq: Map<string, number>,
): number {
  let score = 0;
  const seen = new Set<string>();

  for (let i = 0; i < word.length; i++) {
    const letter = word[i];
    if (!letter) continue;
    const posKey = `${letter}:${i}`;

    // Base letter frequency (only count first occurrence)
    if (!seen.has(letter)) {
      score += letterFreq.get(letter) ?? 0;
      seen.add(letter);
    } else {
      // Penalize duplicate letters
      score -= 0.2;
    }

    // Bonus for position-specific frequency
    score += (positionFreq.get(posKey) ?? 0) * 0.5;
  }

  // Bonus for having 5 unique letters
  if (seen.size === 5) {
    score += 0.5;
  }

  return score;
}

/**
 * Calculate the entropy (expected information gain) for a guess
 * Higher entropy = better guess (eliminates more possibilities on average)
 * Note: This is O(n) where n = possibleWords.length, called for each candidate
 */
export function calculateEntropy(
  guess: string,
  possibleWords: string[],
): number {
  if (possibleWords.length <= 1) return 0;

  // Count how many words produce each feedback pattern
  const patternCounts = new Map<string, number>();

  for (const solution of possibleWords) {
    const pattern = getFeedbackPattern(guess, solution);
    patternCounts.set(pattern, (patternCounts.get(pattern) ?? 0) + 1);
  }

  // Calculate entropy: sum of -p * log2(p) for each pattern
  let entropy = 0;
  const total = possibleWords.length;

  for (const count of patternCounts.values()) {
    const probability = count / total;
    entropy -= probability * Math.log2(probability);
  }

  return entropy;
}

/**
 * Get all unique feedback patterns a guess could produce
 */
export function getPatternDistribution(
  guess: string,
  possibleWords: string[],
): Map<string, string[]> {
  const distribution = new Map<string, string[]>();

  for (const solution of possibleWords) {
    const pattern = getFeedbackPattern(guess, solution);
    const words = distribution.get(pattern) ?? [];
    words.push(solution);
    distribution.set(pattern, words);
  }

  return distribution;
}

/**
 * Get ranked guesses - uses fast letter frequency heuristic
 * Falls back to entropy only for small candidate sets
 */
export function getRankedGuesses(
  state: SolverState,
  allWords: string[],
  limit = 10,
): ScoredWord[] {
  const { possibleWords } = state;

  if (possibleWords.length === 0) return [];
  if (possibleWords.length === 1) {
    const word = possibleWords[0];
    if (!word) return [];
    return [{ word, score: 0, isPossibleSolution: true }];
  }

  // For very small sets, use exact entropy (fast enough)
  if (possibleWords.length <= 20) {
    return getRankedGuessesByEntropy(possibleWords, allWords, limit);
  }

  // For larger sets, use fast letter frequency heuristic
  return getRankedGuessesByFrequency(possibleWords, allWords, limit);
}

/**
 * Fast ranking using letter frequency heuristic - O(n) per word
 */
function getRankedGuessesByFrequency(
  possibleWords: string[],
  allWords: string[],
  limit: number,
): ScoredWord[] {
  const possibleSet = new Set(possibleWords);
  const { letterFreq, positionFreq } =
    calculateLetterFrequencies(possibleWords);

  // Score candidates - prioritize possible solutions
  const scored: ScoredWord[] = [];

  // Always include possible solutions
  for (const word of possibleWords) {
    const score = calculateFrequencyScore(word, letterFreq, positionFreq);
    scored.push({ word, score, isPossibleSolution: true });
  }

  // If we need more variety, sample from all words
  if (possibleWords.length < 50) {
    for (const word of allWords) {
      if (possibleSet.has(word)) continue;
      const score = calculateFrequencyScore(word, letterFreq, positionFreq);
      scored.push({ word, score, isPossibleSolution: false });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.001) return b.score - a.score;
    if (a.isPossibleSolution && !b.isPossibleSolution) return -1;
    if (!a.isPossibleSolution && b.isPossibleSolution) return 1;
    return 0;
  });

  return scored.slice(0, limit);
}

/**
 * Precise ranking using entropy - O(n²), only for small sets
 */
function getRankedGuessesByEntropy(
  possibleWords: string[],
  allWords: string[],
  limit: number,
): ScoredWord[] {
  const possibleSet = new Set(possibleWords);
  const scored: ScoredWord[] = [];

  // Score all words when set is small enough
  const wordsToScore = possibleWords.length <= 10 ? allWords : possibleWords;

  for (const word of wordsToScore) {
    const score = calculateEntropy(word, possibleWords);
    scored.push({
      word,
      score,
      isPossibleSolution: possibleSet.has(word),
    });
  }

  scored.sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.001) return b.score - a.score;
    if (a.isPossibleSolution && !b.isPossibleSolution) return -1;
    if (!a.isPossibleSolution && b.isPossibleSolution) return 1;
    return 0;
  });

  return scored.slice(0, limit);
}

/**
 * Create initial solver state from a word list
 */
export function createSolverState(words: string[]): SolverState {
  return {
    possibleWords: [...words],
    constraints: [],
  };
}

/**
 * Update solver state with new constraints from a guess
 */
export function updateSolverState(
  state: SolverState,
  guess: string,
  pattern: string,
): SolverState {
  // Convert pattern to constraints
  const newConstraints: Constraint[] = [];
  const letters = guess.toUpperCase().split("");

  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    const p = pattern[i];
    if (!letter || !p) continue;

    let constraintState: Constraint["state"];
    if (p === "C") constraintState = "correct";
    else if (p === "P") constraintState = "present";
    else constraintState = "absent";

    newConstraints.push({
      position: i,
      letter,
      state: constraintState,
    });
  }

  const allConstraints = [...state.constraints, ...newConstraints];
  const filteredWords = filterByConstraints(
    state.possibleWords,
    newConstraints,
  );

  return {
    possibleWords: filteredWords,
    constraints: allConstraints,
  };
}

/**
 * Get the best opening word (pre-computed for common word lists)
 */
export function getBestOpeningWord(allWords: string[]): string {
  const wordsSet = new Set(allWords.map((w) => w.toUpperCase()));

  // Try German openers first (if word list contains German words)
  for (const opener of BEST_OPENERS_DE) {
    if (wordsSet.has(opener)) return opener;
  }

  // Try English openers
  for (const opener of BEST_OPENERS_EN) {
    if (wordsSet.has(opener)) return opener;
  }

  // Fall back to first word if none found
  return allWords[0]?.toUpperCase() ?? "";
}

/**
 * Get pre-computed best openers for instant first-guess suggestions
 */
export function getBestOpeners(allWords: string[]): ScoredWord[] {
  const wordsSet = new Set(allWords.map((w) => w.toUpperCase()));
  const results: ScoredWord[] = [];

  // Check which opener list to use based on word list
  const openers = BEST_OPENERS_DE.some((w) => wordsSet.has(w))
    ? BEST_OPENERS_DE
    : BEST_OPENERS_EN;

  for (const word of openers) {
    if (wordsSet.has(word)) {
      results.push({
        word,
        score: 5 - results.length, // Decreasing score for ranking
        isPossibleSolution: true,
      });
    }
    if (results.length >= 5) break;
  }

  return results;
}
