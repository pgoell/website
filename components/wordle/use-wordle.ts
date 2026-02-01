"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameState, StoredGameState, TileData } from "@/lib/wordle";
import {
  createCurrentRow,
  createEmptyRow,
  evaluateGuess,
  getRandomWord,
  isValidWord,
  MAX_GUESSES,
  updateLetterStates,
  WORD_LENGTH,
} from "@/lib/wordle";
import { VALID_WORDS_DE, WORDS_DE } from "@/lib/wordle/words-de";
import { VALID_WORDS_EN, WORDS_EN } from "@/lib/wordle/words-en";

const STORAGE_KEY_PREFIX = "wordle-state-";

function getStorageKey(locale: string): string {
  return `${STORAGE_KEY_PREFIX}${locale}`;
}

function loadGameState(locale: string): StoredGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(getStorageKey(locale));
    if (!stored) return null;
    return JSON.parse(stored) as StoredGameState;
  } catch {
    return null;
  }
}

function saveGameState(state: GameState, locale: string): void {
  if (typeof window === "undefined") return;
  try {
    const toStore: StoredGameState = {
      solution: state.solution,
      guesses: state.guesses,
      gameStatus: state.gameStatus,
      letterStates: state.letterStates,
      locale,
      timestamp: Date.now(),
    };
    localStorage.setItem(getStorageKey(locale), JSON.stringify(toStore));
  } catch {
    // Ignore storage errors
  }
}

function clearGameState(locale: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getStorageKey(locale));
  } catch {
    // Ignore storage errors
  }
}

export type MessageType = "error" | "success" | "info";

export interface GameMessage {
  text: string;
  type: MessageType;
}

export function useWordle(locale: string) {
  const words = locale === "de" ? WORDS_DE : WORDS_EN;
  const validWords = locale === "de" ? VALID_WORDS_DE : VALID_WORDS_EN;

  const [gameState, setGameState] = useState<GameState>(() => {
    const stored = loadGameState(locale);
    if (stored && stored.locale === locale) {
      return {
        solution: stored.solution,
        guesses: stored.guesses,
        currentGuess: "",
        gameStatus: stored.gameStatus,
        letterStates: stored.letterStates,
      };
    }
    return {
      solution: getRandomWord(words),
      guesses: [],
      currentGuess: "",
      gameStatus: "playing",
      letterStates: {},
    };
  });

  const [message, setMessage] = useState<GameMessage | null>(null);
  const [shakeRow, setShakeRow] = useState<number | undefined>(undefined);

  // Save state on changes
  useEffect(() => {
    saveGameState(gameState, locale);
  }, [gameState, locale]);

  // Clear message after timeout
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Clear shake after animation
  useEffect(() => {
    if (shakeRow !== undefined) {
      const timer = setTimeout(() => setShakeRow(undefined), 500);
      return () => clearTimeout(timer);
    }
  }, [shakeRow]);

  const showMessage = useCallback((text: string, type: MessageType) => {
    setMessage({ text, type });
  }, []);

  const addLetter = useCallback(
    (letter: string) => {
      if (gameState.gameStatus !== "playing") return;
      if (gameState.currentGuess.length >= WORD_LENGTH) return;

      setGameState((prev) => ({
        ...prev,
        currentGuess: prev.currentGuess + letter.toUpperCase(),
      }));
    },
    [gameState.gameStatus, gameState.currentGuess.length],
  );

  const removeLetter = useCallback(() => {
    if (gameState.gameStatus !== "playing") return;
    if (gameState.currentGuess.length === 0) return;

    setGameState((prev) => ({
      ...prev,
      currentGuess: prev.currentGuess.slice(0, -1),
    }));
  }, [gameState.gameStatus, gameState.currentGuess.length]);

  const submitGuess = useCallback(() => {
    if (gameState.gameStatus !== "playing") return;

    const guess = gameState.currentGuess;

    if (guess.length < WORD_LENGTH) {
      showMessage("Not enough letters", "error");
      setShakeRow(gameState.guesses.length);
      return;
    }

    if (!isValidWord(guess, validWords)) {
      showMessage("Not in word list", "error");
      setShakeRow(gameState.guesses.length);
      // Clear the invalid guess so user can try again
      setGameState((prev) => ({
        ...prev,
        currentGuess: "",
      }));
      return;
    }

    const evaluation = evaluateGuess(guess, gameState.solution);
    const newLetterStates = updateLetterStates(
      gameState.letterStates,
      evaluation,
    );

    const isWin = guess.toUpperCase() === gameState.solution.toUpperCase();
    const isLastGuess = gameState.guesses.length + 1 >= MAX_GUESSES;

    let newStatus: GameState["gameStatus"] = "playing";
    if (isWin) {
      newStatus = "won";
      showMessage("You won!", "success");
    } else if (isLastGuess) {
      newStatus = "lost";
      showMessage(`The word was ${gameState.solution}`, "info");
    }

    setGameState((prev) => ({
      ...prev,
      guesses: [...prev.guesses, guess],
      currentGuess: "",
      gameStatus: newStatus,
      letterStates: newLetterStates,
    }));
  }, [
    gameState.gameStatus,
    gameState.currentGuess,
    gameState.solution,
    gameState.guesses,
    gameState.letterStates,
    validWords,
    showMessage,
  ]);

  const resetGame = useCallback(() => {
    clearGameState(locale);
    setGameState({
      solution: getRandomWord(words),
      guesses: [],
      currentGuess: "",
      gameStatus: "playing",
      letterStates: {},
    });
    setMessage(null);
  }, [locale, words]);

  // Handle physical keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.gameStatus !== "playing") return;

      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        submitGuess();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        removeLetter();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        addLetter(e.key);
      } else if (locale === "de" && /^[äöüÄÖÜ]$/.test(e.key)) {
        addLetter(e.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState.gameStatus, submitGuess, removeLetter, addLetter, locale]);

  // Build the board rows
  const boardRows = useMemo((): TileData[][] => {
    const rows: TileData[][] = [];

    // Add completed guesses
    for (const guess of gameState.guesses) {
      rows.push(evaluateGuess(guess, gameState.solution));
    }

    // Add current guess row if still playing
    if (gameState.gameStatus === "playing" && rows.length < MAX_GUESSES) {
      rows.push(createCurrentRow(gameState.currentGuess));
    }

    // Fill remaining rows with empty tiles
    while (rows.length < MAX_GUESSES) {
      rows.push(createEmptyRow());
    }

    return rows;
  }, [
    gameState.guesses,
    gameState.currentGuess,
    gameState.solution,
    gameState.gameStatus,
  ]);

  // Current input position
  const currentRowIndex =
    gameState.gameStatus === "playing" ? gameState.guesses.length : undefined;
  const currentTileIndex =
    gameState.gameStatus === "playing"
      ? gameState.currentGuess.length
      : undefined;

  return {
    gameState,
    boardRows,
    message,
    shakeRow,
    currentRowIndex,
    currentTileIndex,
    addLetter,
    removeLetter,
    submitGuess,
    resetGame,
  };
}
