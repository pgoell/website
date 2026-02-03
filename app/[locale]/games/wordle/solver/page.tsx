"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  SolverInputGrid,
  useSolverInput,
} from "@/components/wordle/solver/solver-input-grid";
import { SolverSuggestions } from "@/components/wordle/solver/solver-suggestions";
import { WORDS_DE, WORDS_EN } from "@/lib/wordle";
import {
  createSolverState,
  getRankedGuesses,
  updateSolverState,
} from "@/lib/wordle/solver";

export default function SolverPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const wordList = locale === "de" ? WORDS_DE : WORDS_EN;
  const isDE = locale === "de";

  const {
    rows,
    currentRowIndex,
    handleTileClick,
    handleLetterInput,
    handleBackspace,
    handleSubmit,
    getSubmittedGuesses,
    reset,
  } = useSolverInput();

  // Calculate solver state from submitted guesses
  const { suggestions, possibleWordsCount } = useMemo(() => {
    const guesses = getSubmittedGuesses();
    let state = createSolverState(wordList);

    for (const { word, pattern } of guesses) {
      state = updateSolverState(state, word, pattern);
    }

    const suggestions = getRankedGuesses(state, wordList, 10);
    return {
      suggestions,
      possibleWordsCount: state.possibleWords.length,
    };
  }, [getSubmittedGuesses, wordList]);

  const hasSubmittedGuesses = rows.some((r) => r.submitted);

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="w-full">
        <Link
          href={`/${locale}/games/wordle`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {isDE ? "zurück" : "back"}
        </Link>
      </div>
      <h1 className="text-2xl font-bold">
        {isDE ? "Wordle Solver" : "Wordle Solver"}
      </h1>
      <p className="text-muted-foreground text-center max-w-md">
        {isDE
          ? "Hilfe beim Lösen von Wordle-Rätseln. Gib deine Versuche ein und erhalte Vorschläge."
          : "Get help solving any Wordle puzzle. Enter your guesses and get suggestions."}
      </p>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Input grid */}
        <div className="flex flex-col items-center gap-4">
          <SolverInputGrid
            rows={rows}
            currentRowIndex={currentRowIndex}
            onTileClick={handleTileClick}
            onLetterInput={handleLetterInput}
            onBackspace={handleBackspace}
            onSubmit={handleSubmit}
            locale={locale}
          />

          <Button onClick={reset} variant="outline" className="gap-2">
            <RotateCcw className="size-4" />
            {isDE ? "Zurücksetzen" : "Reset"}
          </Button>
        </div>

        {/* Suggestions */}
        {hasSubmittedGuesses && (
          <div className="min-w-[300px]">
            <SolverSuggestions
              suggestions={suggestions}
              possibleWordsCount={possibleWordsCount}
              locale={locale}
            />
          </div>
        )}
      </div>
    </div>
  );
}
