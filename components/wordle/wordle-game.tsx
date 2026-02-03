"use client";

import { Bot, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WORDS_DE, WORDS_EN } from "@/lib/wordle";
import { SolverHintButton, useSolver } from "./solver";
import { useWordle } from "./use-wordle";
import { WordleBoard } from "./wordle-board";
import { WordleKeyboard } from "./wordle-keyboard";

interface WordleGameProps {
  locale: string;
}

export function WordleGame({ locale }: WordleGameProps) {
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
  } = useWordle(locale);

  const [hintEnabled, setHintEnabled] = useState(false);
  const wordList = locale === "de" ? WORDS_DE : WORDS_EN;
  const { suggestions, possibleWordsCount } = useSolver({
    wordList,
    guesses: gameState.guesses,
    solution: gameState.solution,
    enabled: hintEnabled && gameState.gameStatus === "playing",
  });

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

      {/* Game board */}
      <WordleBoard
        rows={boardRows}
        shakeRow={shakeRow}
        currentRowIndex={currentRowIndex}
        currentTileIndex={currentTileIndex}
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {gameState.gameStatus === "playing" && (
          <SolverHintButton
            suggestions={suggestions}
            possibleWordsCount={possibleWordsCount}
            locale={locale}
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
          {locale === "de" ? "Neu starten" : "Reset"}
        </Button>

        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/games/wordle/demo`} className="gap-2">
            <Bot className="size-4" />
            {locale === "de" ? "Demo" : "Demo"}
          </Link>
        </Button>

        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/games/wordle/solver`}>
            {locale === "de" ? "Solver" : "Solver"}
          </Link>
        </Button>
      </div>

      {/* Keyboard */}
      <WordleKeyboard
        letterStates={gameState.letterStates}
        onKey={addLetter}
        onEnter={submitGuess}
        onBackspace={removeLetter}
        locale={locale}
      />
    </div>
  );
}
