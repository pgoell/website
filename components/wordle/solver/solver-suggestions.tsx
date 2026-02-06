"use client";

import { useTranslations } from "next-intl";
import type { ScoredWord } from "@/lib/wordle/solver";

interface SolverSuggestionsProps {
  suggestions: ScoredWord[];
  possibleWordsCount: number;
}

export function SolverSuggestions({
  suggestions,
  possibleWordsCount,
}: SolverSuggestionsProps) {
  const t = useTranslations("games.wordle.solver");

  if (suggestions.length === 0) {
    return (
      <div className="text-muted-foreground text-center py-4">
        {t("noMatches")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <span className="text-muted-foreground">{t("wordsRemaining")}: </span>
        <span className="font-bold text-xl">{possibleWordsCount}</span>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium text-center">{t("recommended")}</h3>

        <div className="space-y-1">
          {suggestions.map((s, i) => (
            <div
              key={s.word}
              className="flex items-center justify-between bg-muted rounded-md px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground w-6">{i + 1}.</span>
                <span className="font-mono font-bold text-lg">{s.word}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {t("info")}: {s.score.toFixed(2)} bits
                </span>
                {s.isPossibleSolution && (
                  <span className="bg-[var(--wordle-correct)] text-white dark:text-primary-foreground px-2 py-0.5 rounded text-xs">
                    {t("possible")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
