import type { DieState, Player, ScoreCategory } from "./types";
import {
  LOWER_CATEGORIES,
  UPPER_BONUS_THRESHOLD,
  UPPER_BONUS_VALUE,
  UPPER_CATEGORIES,
} from "./types";

/**
 * Get dice values as an array of numbers
 */
export function getDiceValues(dice: DieState[]): number[] {
  return dice.map((d) => d.value);
}

/**
 * Count occurrences of each die value
 */
export function countDice(values: number[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1;
  }
  return counts;
}

/**
 * Sum all dice values
 */
export function sumDice(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0);
}

/**
 * Calculate score for upper section categories (ones through sixes)
 */
export function scoreUpper(values: number[], target: number): number {
  return values.filter((v) => v === target).reduce((sum, v) => sum + v, 0);
}

/**
 * Check if dice contain N of a kind
 */
export function hasNOfAKind(values: number[], n: number): boolean {
  const counts = countDice(values);
  return Object.values(counts).some((count) => count >= n);
}

/**
 * Score three of a kind (sum of all dice if valid)
 */
export function scoreThreeOfAKind(values: number[]): number {
  return hasNOfAKind(values, 3) ? sumDice(values) : 0;
}

/**
 * Score four of a kind (sum of all dice if valid)
 */
export function scoreFourOfAKind(values: number[]): number {
  return hasNOfAKind(values, 4) ? sumDice(values) : 0;
}

/**
 * Check if dice form a full house (3 of one kind + 2 of another)
 */
export function isFullHouse(values: number[]): boolean {
  const counts = Object.values(countDice(values));
  return counts.includes(3) && counts.includes(2);
}

/**
 * Score full house (25 points if valid)
 */
export function scoreFullHouse(values: number[]): number {
  return isFullHouse(values) ? 25 : 0;
}

/**
 * Check if dice contain a small straight (4 consecutive values)
 */
export function isSmallStraight(values: number[]): boolean {
  const unique = [...new Set(values)].sort((a, b) => a - b);
  const straights = [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 6],
  ];
  return straights.some((straight) =>
    straight.every((v) => unique.includes(v)),
  );
}

/**
 * Score small straight (30 points if valid)
 */
export function scoreSmallStraight(values: number[]): number {
  return isSmallStraight(values) ? 30 : 0;
}

/**
 * Check if dice form a large straight (5 consecutive values)
 */
export function isLargeStraight(values: number[]): boolean {
  const sorted = [...values].sort((a, b) => a - b);
  const low = [1, 2, 3, 4, 5];
  const high = [2, 3, 4, 5, 6];
  return (
    sorted.every((v, i) => v === low[i]) ||
    sorted.every((v, i) => v === high[i])
  );
}

/**
 * Score large straight (40 points if valid)
 */
export function scoreLargeStraight(values: number[]): number {
  return isLargeStraight(values) ? 40 : 0;
}

/**
 * Check if dice are a Kniffel (5 of a kind)
 */
export function isKniffel(values: number[]): boolean {
  return hasNOfAKind(values, 5);
}

/**
 * Score Kniffel (50 points if valid)
 */
export function scoreKniffel(values: number[]): number {
  return isKniffel(values) ? 50 : 0;
}

/**
 * Score chance (sum of all dice)
 */
export function scoreChance(values: number[]): number {
  return sumDice(values);
}

/**
 * Calculate potential score for a category given dice values
 */
export function calculateScore(
  category: ScoreCategory,
  dice: DieState[],
): number {
  const values = getDiceValues(dice);

  switch (category) {
    case "ones":
      return scoreUpper(values, 1);
    case "twos":
      return scoreUpper(values, 2);
    case "threes":
      return scoreUpper(values, 3);
    case "fours":
      return scoreUpper(values, 4);
    case "fives":
      return scoreUpper(values, 5);
    case "sixes":
      return scoreUpper(values, 6);
    case "threeOfAKind":
      return scoreThreeOfAKind(values);
    case "fourOfAKind":
      return scoreFourOfAKind(values);
    case "fullHouse":
      return scoreFullHouse(values);
    case "smallStraight":
      return scoreSmallStraight(values);
    case "largeStraight":
      return scoreLargeStraight(values);
    case "kniffel":
      return scoreKniffel(values);
    case "chance":
      return scoreChance(values);
  }
}

/**
 * Calculate upper section total for a player
 */
export function getUpperTotal(player: Player): number {
  return UPPER_CATEGORIES.reduce(
    (sum, cat) => sum + (player.scores[cat] ?? 0),
    0,
  );
}

/**
 * Calculate upper section bonus for a player
 */
export function getUpperBonus(player: Player): number {
  return getUpperTotal(player) >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_VALUE : 0;
}

/**
 * Calculate lower section total for a player
 */
export function getLowerTotal(player: Player): number {
  return LOWER_CATEGORIES.reduce(
    (sum, cat) => sum + (player.scores[cat] ?? 0),
    0,
  );
}

/**
 * Calculate grand total for a player
 */
export function getGrandTotal(player: Player): number {
  return getUpperTotal(player) + getUpperBonus(player) + getLowerTotal(player);
}

/**
 * Check if a player has completed all categories
 */
export function isPlayerComplete(player: Player): boolean {
  return (
    UPPER_CATEGORIES.every((cat) => player.scores[cat] !== null) &&
    LOWER_CATEGORIES.every((cat) => player.scores[cat] !== null)
  );
}

/**
 * Get the winner(s) from a list of players
 */
export function getWinners(players: Player[]): Player[] {
  if (players.length === 0) return [];

  const maxScore = Math.max(...players.map(getGrandTotal));
  return players.filter((p) => getGrandTotal(p) === maxScore);
}
