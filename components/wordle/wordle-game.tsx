"use client";

import { Bot, Keyboard, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { WORDS_DE, WORDS_EN } from "@/lib/wordle";
import { SolverHintButton, useSolver } from "./solver";
import { useWordle } from "./use-wordle";
import { WordleBoard } from "./wordle-board";
import { WordleKeyboard } from "./wordle-keyboard";

export function WordleGame() {
  const locale = useLocale();
  const t = useTranslations("games.wordle");
  const inputRef = useRef<HTMLInputElement>(null);
  const {
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
  } = useWordle();

  const [hintEnabled, setHintEnabled] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("wordle-show-keyboard");
    return stored !== "false";
  });

  useEffect(() => {
    localStorage.setItem("wordle-show-keyboard", String(showKeyboard));
  }, [showKeyboard]);

  const wordList = locale === "de" ? WORDS_DE : WORDS_EN;
  const { suggestions, possibleWordsCount } = useSolver({
    wordList,
    guesses: gameState.guesses,
    solution: gameState.solution,
    enabled: hintEnabled && gameState.gameStatus === "playing",
  });

  const handleMobileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length > 0) {
      const lastChar = value.at(-1);
      if (lastChar && /^[a-zA-ZäöüÄÖÜ]$/.test(lastChar)) {
        addLetter(lastChar);
      }
    }
    // Always clear the input
    e.target.value = "";
  };

  const handleMobileKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitGuess();
    } else if (e.key === "Backspace") {
      e.preventDefault();
      removeLetter();
    }
  };

  const focusInput = () => {
    if (gameState.gameStatus === "playing") {
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Message display */}
      <div className="h-8 flex items-center justify-center">
        {message && (
          <div
            className={`px-4 py-1.5 rounded-md text-sm font-medium ${
              message.type === "error"
                ? "bg-destructive text-destructive-foreground"
                : message.type === "success"
                  ? "bg-[var(--wordle-correct)] text-white dark:text-primary-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
            role="alert"
            aria-live="polite"
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Hidden input for mobile keyboard */}
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className="sr-only"
        onChange={handleMobileInput}
        onKeyDown={handleMobileKeyDown}
        aria-label="Type your guess"
      />

      {/* Game board */}
      <button
        type="button"
        onClick={focusInput}
        className="focus:outline-none"
        aria-label="Tap to type"
      >
        <WordleBoard
          rows={boardRows}
          shakeRow={shakeRow}
          currentRowIndex={currentRowIndex}
          currentTileIndex={currentTileIndex}
        />
      </button>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {gameState.gameStatus === "playing" && (
          <SolverHintButton
            suggestions={suggestions}
            possibleWordsCount={possibleWordsCount}
            onToggle={setHintEnabled}
          />
        )}

        <Button
          onClick={resetGame}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RotateCcw className="size-4" />
          {t("reset")}
        </Button>

        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/games/wordle/demo`} className="gap-2">
            <Bot className="size-4" />
            Demo
          </Link>
        </Button>

        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/games/wordle/solver`}>Solver</Link>
        </Button>

        <Button
          variant={showKeyboard ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setShowKeyboard(!showKeyboard)}
          className="gap-2"
          aria-label={showKeyboard ? t("hideKeyboard") : t("showKeyboard")}
        >
          <Keyboard className="size-4" />
        </Button>
      </div>

      {/* Keyboard */}
      {showKeyboard && (
        <WordleKeyboard
          letterStates={gameState.letterStates}
          onKey={addLetter}
          onEnter={submitGuess}
          onBackspace={removeLetter}
          disabled={gameState.gameStatus !== "playing"}
        />
      )}
    </div>
  );
}
