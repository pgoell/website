import { WORDS_DE, WORDS_DE_SET } from "@/lib/wordle/words-de";
import { WORDS_EN, WORDS_EN_SET } from "@/lib/wordle/words-en";

export type LetterStatus = "correct" | "present" | "absent";

const ALPHABET_EN = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const ALPHABET_DE = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜẞ"];
const ALPHABET_EN_SET = new Set(ALPHABET_EN);
const ALPHABET_DE_SET = new Set(ALPHABET_DE);

const SPECIAL_MAP: Record<string, string> = {
  ä: "Ä",
  ö: "Ö",
  ü: "Ü",
  ß: "ẞ",
  Ä: "Ä",
  Ö: "Ö",
  Ü: "Ü",
  ẞ: "ẞ",
};

export function getWords(locale: string) {
  return locale === "de" ? WORDS_DE : WORDS_EN;
}

export function getWordSet(locale: string) {
  return locale === "de" ? WORDS_DE_SET : WORDS_EN_SET;
}

export function getAlphabet(locale: string) {
  return locale === "de" ? ALPHABET_DE : ALPHABET_EN;
}

export function getKeyboardLayout(locale: string) {
  if (locale === "de") {
    return [
      ["Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P", "Ü"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ö", "Ä"],
      ["ENTER", "Y", "X", "C", "V", "B", "N", "M", "ẞ", "BACKSPACE"],
    ];
  }

  return [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
  ];
}

export function normalizeChar(char: string, locale: string) {
  if (locale === "de" && SPECIAL_MAP[char]) {
    return SPECIAL_MAP[char];
  }

  const upper = char.toUpperCase();

  if (locale === "de" && SPECIAL_MAP[upper]) {
    return SPECIAL_MAP[upper];
  }

  if (upper.length !== 1) {
    return "";
  }

  return upper;
}

export function isAllowedLetter(letter: string, locale: string) {
  return locale === "de"
    ? ALPHABET_DE_SET.has(letter)
    : ALPHABET_EN_SET.has(letter);
}

export function evaluateGuess(guess: string, answer: string) {
  const guessLetters = Array.from(guess);
  const answerLetters = Array.from(answer);
  const result: LetterStatus[] = Array.from({ length: guessLetters.length });
  const remaining: Record<string, number> = {};

  guessLetters.forEach((letter, index) => {
    if (letter === answerLetters[index]) {
      result[index] = "correct";
    } else {
      const target = answerLetters[index];
      remaining[target] = (remaining[target] ?? 0) + 1;
    }
  });

  guessLetters.forEach((letter, index) => {
    if (result[index]) {
      return;
    }

    const count = remaining[letter] ?? 0;
    if (count > 0) {
      result[index] = "present";
      remaining[letter] = count - 1;
    } else {
      result[index] = "absent";
    }
  });

  return result;
}

export function getKeyboardState(
  guesses: string[],
  evaluations: LetterStatus[][],
) {
  const state: Record<string, LetterStatus> = {};
  const priority: Record<LetterStatus, number> = {
    absent: 1,
    present: 2,
    correct: 3,
  };

  guesses.forEach((guess, guessIndex) => {
    const letters = Array.from(guess);
    const evaluation = evaluations[guessIndex] ?? [];
    letters.forEach((letter, index) => {
      const status = evaluation[index];
      if (!status) {
        return;
      }

      const existing = state[letter];
      if (!existing || priority[status] > priority[existing]) {
        state[letter] = status;
      }
    });
  });

  return state;
}

export function pickAnswer(words: string[]) {
  return words[Math.floor(Math.random() * words.length)];
}
