"use client";

import type { ScoredWord } from "@/lib/wordle/solver";

interface SolverSuggestionsProps {
  suggestions: ScoredWord[];
  possibleWordsCount: number;
  locale: string;
}

export function SolverSuggestions({
  suggestions,
  possibleWordsCount,
  locale,
}: SolverSuggestionsProps) {
  const isDE = locale === "de";

  if (suggestions.length === 0) {
    return (
      <div className="text-muted-foreground text-center py-4">
        {isDE ? "Keine passenden Worte gefunden" : "No matching words found"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <span className="text-muted-foreground">
          {isDE ? "Verbleibende Worte" : "Words remaining"}:{" "}
        </span>
        <span className="font-bold text-xl">{possibleWordsCount}</span>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium text-center">
          {isDE ? "Empfohlene Vorschläge" : "Recommended guesses"}
        </h3>

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
                  {isDE ? "Info" : "Info"}: {s.score.toFixed(2)} bits
                </span>
                {s.isPossibleSolution && (
                  <span className="bg-[var(--wordle-correct)] text-white dark:text-primary-foreground px-2 py-0.5 rounded text-xs">
                    {isDE ? "Möglich" : "Possible"}
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
