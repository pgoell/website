"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
                  ? "bg-[var(--wordle-correct)] text-white"
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

      {/* Game over state */}
      {gameState.gameStatus !== "playing" && (
        <Button onClick={resetGame} variant="outline" className="gap-2">
          <RotateCcw className="size-4" />
          {locale === "de" ? "Nochmal spielen" : "Play Again"}
        </Button>
      )}

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
