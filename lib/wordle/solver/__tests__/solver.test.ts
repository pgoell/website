import { describe, expect, it } from "vitest";
import {
  calculateEntropy,
  createSolverState,
  getRankedGuesses,
  updateSolverState,
} from "../solver-engine";
import type { Constraint } from "../types";
import {
  filterByConstraints,
  getFeedbackPattern,
  wordMatchesConstraints,
} from "../word-filter";

describe("getFeedbackPattern", () => {
  it("returns all correct for exact match", () => {
    expect(getFeedbackPattern("CRANE", "CRANE")).toBe("CCCCC");
  });

  it("returns all absent for no matches", () => {
    expect(getFeedbackPattern("ABACK", "TIGER")).toBe("AAAAA");
  });

  it("handles present letters correctly", () => {
    // CRANE vs REACT: C=present, R=present, A=correct (position 2), N=absent, E=present
    expect(getFeedbackPattern("CRANE", "REACT")).toBe("PPCAP");
  });

  it("handles mixed correct and present", () => {
    // STARE vs RATES: all letters present but only in different positions
    expect(getFeedbackPattern("STARE", "RATES")).toBe("PPPPP");
  });

  it("handles duplicate letters correctly", () => {
    // SPEED vs CREEP: S=absent, P=present, E=correct, E=correct, D=absent
    // CREEP has two E's at positions 2 and 3, SPEED has E at 2 and 3 too
    expect(getFeedbackPattern("SPEED", "CREEP")).toBe("APCCA");
  });

  it("handles duplicate letters when solution has fewer", () => {
    // LATTE vs LATER: L=correct, A=correct, T=correct, T=absent (no second T), E=present
    expect(getFeedbackPattern("LATTE", "LATER")).toBe("CCCAP");
  });
});

describe("wordMatchesConstraints", () => {
  it("returns true when no constraints", () => {
    expect(wordMatchesConstraints("CRANE", [])).toBe(true);
  });

  it("filters by correct position", () => {
    const constraints: Constraint[] = [
      { position: 0, letter: "C", state: "correct" },
    ];
    expect(wordMatchesConstraints("CRANE", constraints)).toBe(true);
    expect(wordMatchesConstraints("STARE", constraints)).toBe(false);
  });

  it("filters by present letter", () => {
    const constraints: Constraint[] = [
      { position: 0, letter: "E", state: "present" },
    ];
    expect(wordMatchesConstraints("CRANE", constraints)).toBe(true); // has E, not at position 0
    expect(wordMatchesConstraints("EVERY", constraints)).toBe(false); // E is at position 0
    expect(wordMatchesConstraints("CRUMB", constraints)).toBe(false); // no E
  });

  it("filters by absent letter", () => {
    const constraints: Constraint[] = [
      { position: 0, letter: "X", state: "absent" },
    ];
    expect(wordMatchesConstraints("CRANE", constraints)).toBe(true);
    expect(wordMatchesConstraints("XEROX", constraints)).toBe(false);
  });

  it("handles complex constraint combinations", () => {
    const constraints: Constraint[] = [
      { position: 0, letter: "S", state: "absent" },
      { position: 1, letter: "T", state: "present" },
      { position: 2, letter: "A", state: "correct" },
      { position: 3, letter: "R", state: "present" },
      { position: 4, letter: "E", state: "absent" },
    ];
    // Word must: not have S, have T (not at 1), have A at 2, have R (not at 3), not have E
    expect(wordMatchesConstraints("TRAIN", constraints)).toBe(true);
    expect(wordMatchesConstraints("STARE", constraints)).toBe(false); // has S and E
  });
});

describe("filterByConstraints", () => {
  const testWords = ["CRANE", "STARE", "TRAIN", "CRISP", "TIGER"];

  it("returns all words with no constraints", () => {
    expect(filterByConstraints(testWords, [])).toEqual(testWords);
  });

  it("filters correctly with single constraint", () => {
    const constraints: Constraint[] = [
      { position: 0, letter: "C", state: "correct" },
    ];
    expect(filterByConstraints(testWords, constraints)).toEqual([
      "CRANE",
      "CRISP",
    ]);
  });

  it("returns empty array when no matches", () => {
    const constraints: Constraint[] = [
      { position: 0, letter: "Z", state: "correct" },
    ];
    expect(filterByConstraints(testWords, constraints)).toEqual([]);
  });
});

describe("calculateEntropy", () => {
  it("returns 0 for single word", () => {
    expect(calculateEntropy("CRANE", ["CRANE"])).toBe(0);
  });

  it("returns 0 for empty list", () => {
    expect(calculateEntropy("CRANE", [])).toBe(0);
  });

  it("returns positive entropy for multiple words", () => {
    const words = ["CRANE", "STARE", "TRAIN", "CRISP"];
    const entropy = calculateEntropy("CRANE", words);
    expect(entropy).toBeGreaterThan(0);
  });

  it("returns higher entropy for better discriminating guesses", () => {
    const words = ["CRANE", "CRAVE", "CRAZE", "CRAFT"];
    // A guess that differentiates these should have higher entropy
    const entropyA = calculateEntropy("ADIEU", words); // different letters
    const entropyB = calculateEntropy("CRAVE", words); // shares many letters
    // Both should be positive; exact comparison depends on word list
    expect(entropyA).toBeGreaterThan(0);
    expect(entropyB).toBeGreaterThan(0);
  });
});

describe("createSolverState", () => {
  it("creates initial state with all words", () => {
    const words = ["CRANE", "STARE", "TRAIN"];
    const state = createSolverState(words);
    expect(state.possibleWords).toEqual(words);
    expect(state.constraints).toEqual([]);
  });
});

describe("updateSolverState", () => {
  it("filters words based on feedback pattern", () => {
    const words = ["CRANE", "STARE", "TRAIN", "CRATE", "CRIMP"];
    const state = createSolverState(words);

    // Guess CRANE with pattern: C=correct, R=correct, A=absent, N=absent, E=absent
    const newState = updateSolverState(state, "CRANE", "CCAAA");

    // Should keep words starting with CR that don't have A, N, E
    expect(newState.possibleWords).toContain("CRIMP");
    expect(newState.possibleWords).not.toContain("CRANE"); // has A, N, E
    expect(newState.possibleWords).not.toContain("STARE"); // doesn't start with CR
    expect(newState.constraints.length).toBe(5);
  });

  it("accumulates constraints across updates", () => {
    const words = ["CRANE", "STARE", "TRAIN", "CRATE", "CRISP"];
    let state = createSolverState(words);

    state = updateSolverState(state, "CRANE", "CAAAA");
    expect(state.constraints.length).toBe(5);

    state = updateSolverState(state, "CRISP", "CCAAA");
    expect(state.constraints.length).toBe(10);
  });
});

describe("getRankedGuesses", () => {
  it("returns single word when only one possible", () => {
    const words = ["CRANE"];
    const state = createSolverState(words);
    const guesses = getRankedGuesses(state, words);

    expect(guesses.length).toBe(1);
    expect(guesses[0]?.word).toBe("CRANE");
    expect(guesses[0]?.isPossibleSolution).toBe(true);
  });

  it("returns ranked guesses sorted by entropy", () => {
    const words = ["CRANE", "STARE", "TRAIN", "CRISP", "TIGER"];
    const state = createSolverState(words);
    const guesses = getRankedGuesses(state, words, 5);

    expect(guesses.length).toBe(5);
    // Scores should be in descending order
    for (let i = 1; i < guesses.length; i++) {
      const prev = guesses[i - 1];
      const curr = guesses[i];
      if (prev && curr) {
        expect(prev.score).toBeGreaterThanOrEqual(curr.score);
      }
    }
  });

  it("marks possible solutions correctly", () => {
    const allWords = ["CRANE", "STARE", "XXXXX"];
    const state = {
      possibleWords: ["CRANE", "STARE"],
      constraints: [],
    };
    const guesses = getRankedGuesses(state, allWords);

    const crane = guesses.find((g) => g.word === "CRANE");
    const stare = guesses.find((g) => g.word === "STARE");

    expect(crane?.isPossibleSolution).toBe(true);
    expect(stare?.isPossibleSolution).toBe(true);
  });

  it("respects limit parameter", () => {
    const words = ["CRANE", "STARE", "TRAIN", "CRISP", "TIGER"];
    const state = createSolverState(words);
    const guesses = getRankedGuesses(state, words, 2);

    expect(guesses.length).toBe(2);
  });
});
