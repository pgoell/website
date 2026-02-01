import { describe, expect, it } from "vitest";
import {
  createCurrentRow,
  createEmptyRow,
  evaluateGuess,
  getRandomWord,
  isValidWord,
  updateLetterStates,
  WORD_LENGTH,
} from "../game-logic";

describe("getRandomWord", () => {
  it("returns a word from the list", () => {
    const words = ["APPLE", "BRAIN", "CRANE"];
    const word = getRandomWord(words);
    expect(words).toContain(word);
  });

  it("throws error for empty list", () => {
    expect(() => getRandomWord([])).toThrow("Word list is empty");
  });
});

describe("evaluateGuess", () => {
  it("marks all letters correct when guess matches solution", () => {
    const result = evaluateGuess("CRANE", "CRANE");
    expect(result).toEqual([
      { letter: "C", state: "correct" },
      { letter: "R", state: "correct" },
      { letter: "A", state: "correct" },
      { letter: "N", state: "correct" },
      { letter: "E", state: "correct" },
    ]);
  });

  it("marks absent letters correctly", () => {
    const result = evaluateGuess("APPLE", "CRANE");
    expect(result).toEqual([
      { letter: "A", state: "present" },
      { letter: "P", state: "absent" },
      { letter: "P", state: "absent" },
      { letter: "L", state: "absent" },
      { letter: "E", state: "correct" },
    ]);
  });

  it("marks present letters in wrong position", () => {
    // HEART vs EARTH: all letters exist but in different positions
    // H(0) vs E(0): H is at pos 4 in EARTH → present
    // E(1) vs A(1): E is at pos 0 in EARTH → present
    // A(2) vs R(2): A is at pos 1 in EARTH → present
    // R(3) vs T(3): R is at pos 2 in EARTH → present
    // T(4) vs H(4): T is at pos 3 in EARTH → present
    const result = evaluateGuess("HEART", "EARTH");
    expect(result).toEqual([
      { letter: "H", state: "present" },
      { letter: "E", state: "present" },
      { letter: "A", state: "present" },
      { letter: "R", state: "present" },
      { letter: "T", state: "present" },
    ]);
  });

  it("handles duplicate letters correctly", () => {
    // EERIE vs CRANE: guess has three E's, solution has one E at position 4
    // E(0) vs C(0): not match, E is in solution but pos 4 is claimed by E(4) → absent
    // E(1) vs R(1): not match, E already used → absent
    // R(2) vs A(2): not match, R is at pos 1 in CRANE → present
    // I(3) vs N(3): not match, I not in CRANE → absent
    // E(4) vs E(4): exact match → correct
    const result = evaluateGuess("EERIE", "CRANE");
    expect(result).toEqual([
      { letter: "E", state: "absent" },
      { letter: "E", state: "absent" },
      { letter: "R", state: "present" },
      { letter: "I", state: "absent" },
      { letter: "E", state: "correct" },
    ]);
  });

  it("handles case insensitively", () => {
    const result = evaluateGuess("crane", "CRANE");
    expect(result.every((t) => t.state === "correct")).toBe(true);
  });
});

describe("updateLetterStates", () => {
  it("adds new letter states", () => {
    const result = updateLetterStates({}, [
      { letter: "C", state: "correct" },
      { letter: "R", state: "present" },
      { letter: "A", state: "absent" },
    ]);
    expect(result).toEqual({
      C: "correct",
      R: "present",
      A: "absent",
    });
  });

  it("upgrades state from absent to present", () => {
    const result = updateLetterStates({ A: "absent" }, [
      { letter: "A", state: "present" },
    ]);
    expect(result.A).toBe("present");
  });

  it("upgrades state from present to correct", () => {
    const result = updateLetterStates({ A: "present" }, [
      { letter: "A", state: "correct" },
    ]);
    expect(result.A).toBe("correct");
  });

  it("does not downgrade state", () => {
    const result = updateLetterStates({ A: "correct" }, [
      { letter: "A", state: "absent" },
    ]);
    expect(result.A).toBe("correct");
  });
});

describe("isValidWord", () => {
  it("returns true for valid words", () => {
    const validWords = new Set(["CRANE", "BRAIN", "APPLE"]);
    expect(isValidWord("CRANE", validWords)).toBe(true);
    expect(isValidWord("crane", validWords)).toBe(true); // case insensitive
  });

  it("returns false for invalid words", () => {
    const validWords = new Set(["CRANE", "BRAIN"]);
    expect(isValidWord("XXXXX", validWords)).toBe(false);
  });
});

describe("createEmptyRow", () => {
  it("creates a row of empty tiles", () => {
    const row = createEmptyRow();
    expect(row).toHaveLength(WORD_LENGTH);
    expect(row.every((t) => t.letter === "" && t.state === "empty")).toBe(true);
  });
});

describe("createCurrentRow", () => {
  it("creates a row with entered letters", () => {
    const row = createCurrentRow("CRA");
    expect(row).toHaveLength(WORD_LENGTH);
    expect(row[0]).toEqual({ letter: "C", state: "tbd" });
    expect(row[1]).toEqual({ letter: "R", state: "tbd" });
    expect(row[2]).toEqual({ letter: "A", state: "tbd" });
    expect(row[3]).toEqual({ letter: "", state: "empty" });
    expect(row[4]).toEqual({ letter: "", state: "empty" });
  });

  it("creates empty row for empty string", () => {
    const row = createCurrentRow("");
    expect(row.every((t) => t.letter === "" && t.state === "empty")).toBe(true);
  });
});
