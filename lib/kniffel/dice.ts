import type { DieState } from "./types";
import { NUM_DICE } from "./types";

/**
 * Generate a random die value (1-6)
 */
export function randomDieValue(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Create initial dice state (all unheld, value 1)
 */
export function createInitialDice(): DieState[] {
  return Array.from({ length: NUM_DICE }, () => ({
    value: 1,
    held: false,
  }));
}

/**
 * Roll all unheld dice
 */
export function rollDice(dice: DieState[]): DieState[] {
  return dice.map((die) => ({
    value: die.held ? die.value : randomDieValue(),
    held: die.held,
  }));
}

/**
 * Toggle hold state of a specific die
 */
export function toggleHold(dice: DieState[], index: number): DieState[] {
  return dice.map((die, i) =>
    i === index ? { ...die, held: !die.held } : die,
  );
}

/**
 * Reset all dice to unheld state
 */
export function resetHolds(dice: DieState[]): DieState[] {
  return dice.map((die) => ({ ...die, held: false }));
}

/**
 * Check if any dice are held
 */
export function hasHeldDice(dice: DieState[]): boolean {
  return dice.some((die) => die.held);
}
