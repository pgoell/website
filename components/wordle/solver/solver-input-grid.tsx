"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MAX_GUESSES, WORD_LENGTH } from "@/lib/wordle";
import type { ConstraintState } from "@/lib/wordle/solver";

export interface InputTile {
  letter: string;
  state: ConstraintState | "empty";
}

export interface InputRow {
  tiles: InputTile[];
  submitted: boolean;
}

interface SolverInputGridProps {
  rows: InputRow[];
  currentRowIndex: number;
  onTileClick: (rowIndex: number, tileIndex: number) => void;
  onLetterInput: (letter: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  locale: string;
}

const STATE_COLORS: Record<ConstraintState | "empty", string> = {
  empty: "bg-background border-border text-foreground",
  absent: "bg-muted border-muted text-muted-foreground",
  present:
    "bg-[var(--wordle-present)] border-[var(--wordle-present)] text-white dark:text-primary-foreground",
  correct:
    "bg-[var(--wordle-correct)] border-[var(--wordle-correct)] text-white dark:text-primary-foreground",
};

export function SolverInputGrid({
  rows,
  currentRowIndex,
  onTileClick,
  onLetterInput,
  onBackspace,
  onSubmit,
  locale,
}: SolverInputGridProps) {
  const isDE = locale === "de";

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        onSubmit();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        onBackspace();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        onLetterInput(e.key.toUpperCase());
      } else if (locale === "de" && /^[äöüÄÖÜ]$/.test(e.key)) {
        onLetterInput(e.key.toUpperCase());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onLetterInput, onBackspace, onSubmit, locale]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Instructions */}
      <p className="text-sm text-muted-foreground text-center">
        {isDE
          ? "Tippe dein Wort ein, dann klicke auf Kacheln um den Status zu ändern"
          : "Type your word, then click tiles to change their status"}
      </p>

      {/* Grid */}
      <div className="grid gap-1.5">
        {rows.map((row, rowIndex) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are static
          <div key={rowIndex} className="flex gap-1.5">
            {row.tiles.map((tile, tileIndex) => (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: tiles are static
                key={tileIndex}
                type="button"
                onClick={() => onTileClick(rowIndex, tileIndex)}
                disabled={!row.submitted && rowIndex !== currentRowIndex}
                className={`
                  size-14 border-2 flex items-center justify-center
                  text-2xl font-bold uppercase transition-colors
                  ${STATE_COLORS[tile.state]}
                  ${
                    row.submitted
                      ? "cursor-pointer hover:opacity-80"
                      : rowIndex === currentRowIndex
                        ? "cursor-text"
                        : "cursor-not-allowed opacity-50"
                  }
                `}
              >
                {tile.letter}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Submit button */}
      <Button
        onClick={onSubmit}
        disabled={
          currentRowIndex >= MAX_GUESSES ||
          rows[currentRowIndex]?.tiles.some((t) => !t.letter)
        }
      >
        {isDE ? "Vorschlag holen" : "Get Suggestions"}
      </Button>

      {/* Legend */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="size-4 bg-muted border border-muted-foreground/20" />
          <span>{isDE ? "Falsch" : "Absent"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-4 bg-[var(--wordle-present)]" />
          <span>{isDE ? "Falsche Stelle" : "Present"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-4 bg-[var(--wordle-correct)]" />
          <span>{isDE ? "Richtig" : "Correct"}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing solver input state
 */
export function useSolverInput() {
  const [rows, setRows] = useState<InputRow[]>(() =>
    Array.from({ length: MAX_GUESSES }, () => ({
      tiles: Array.from({ length: WORD_LENGTH }, () => ({
        letter: "",
        state: "empty" as const,
      })),
      submitted: false,
    })),
  );
  const [currentRowIndex, setCurrentRowIndex] = useState(0);

  const handleTileClick = useCallback((rowIndex: number, tileIndex: number) => {
    setRows((prev) => {
      const newRows = [...prev];
      const row = newRows[rowIndex];
      if (!row) return prev;

      const tile = row.tiles[tileIndex];
      if (!tile || !tile.letter) return prev;

      // Only allow cycling on submitted rows
      if (row.submitted) {
        const states: ConstraintState[] = ["absent", "present", "correct"];
        const currentIndex = states.indexOf(tile.state as ConstraintState);
        const nextState =
          states[(currentIndex + 1) % states.length] ?? "absent";

        const newTiles = [...row.tiles];
        newTiles[tileIndex] = { ...tile, state: nextState };
        newRows[rowIndex] = { ...row, tiles: newTiles };
      }

      return newRows;
    });
  }, []);

  const handleLetterInput = useCallback(
    (letter: string) => {
      setRows((prev) => {
        const newRows = [...prev];
        const row = newRows[currentRowIndex];
        if (!row || row.submitted) return prev;

        const emptyIndex = row.tiles.findIndex((t) => !t.letter);
        if (emptyIndex === -1) return prev;

        const newTiles = [...row.tiles];
        newTiles[emptyIndex] = { letter, state: "empty" };
        newRows[currentRowIndex] = { ...row, tiles: newTiles };

        return newRows;
      });
    },
    [currentRowIndex],
  );

  const handleBackspace = useCallback(() => {
    setRows((prev) => {
      const newRows = [...prev];
      const row = newRows[currentRowIndex];
      if (!row || row.submitted) return prev;

      // Find last filled tile
      let lastFilledIndex = -1;
      for (let i = row.tiles.length - 1; i >= 0; i--) {
        if (row.tiles[i]?.letter) {
          lastFilledIndex = i;
          break;
        }
      }

      if (lastFilledIndex === -1) return prev;

      const newTiles = [...row.tiles];
      newTiles[lastFilledIndex] = { letter: "", state: "empty" };
      newRows[currentRowIndex] = { ...row, tiles: newTiles };

      return newRows;
    });
  }, [currentRowIndex]);

  const handleSubmit = useCallback(() => {
    setRows((prev) => {
      const newRows = [...prev];
      const row = newRows[currentRowIndex];
      if (!row) return prev;

      // Check if all tiles have letters
      if (row.tiles.some((t) => !t.letter)) return prev;

      // Mark all empty states as absent by default
      const newTiles = row.tiles.map((t) => ({
        ...t,
        state: t.state === "empty" ? ("absent" as const) : t.state,
      }));
      newRows[currentRowIndex] = { tiles: newTiles, submitted: true };

      return newRows;
    });

    setCurrentRowIndex((i) => Math.min(i + 1, MAX_GUESSES));
  }, [currentRowIndex]);

  const getSubmittedGuesses = useCallback(() => {
    return rows
      .filter((r) => r.submitted)
      .map((r) => ({
        word: r.tiles.map((t) => t.letter).join(""),
        pattern: r.tiles
          .map((t) => {
            if (t.state === "correct") return "C";
            if (t.state === "present") return "P";
            return "A";
          })
          .join(""),
      }));
  }, [rows]);

  const reset = useCallback(() => {
    setRows(
      Array.from({ length: MAX_GUESSES }, () => ({
        tiles: Array.from({ length: WORD_LENGTH }, () => ({
          letter: "",
          state: "empty" as const,
        })),
        submitted: false,
      })),
    );
    setCurrentRowIndex(0);
  }, []);

  return {
    rows,
    currentRowIndex,
    handleTileClick,
    handleLetterInput,
    handleBackspace,
    handleSubmit,
    getSubmittedGuesses,
    reset,
  };
}
