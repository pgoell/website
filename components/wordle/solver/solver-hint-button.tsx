"use client";

import { Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ScoredWord } from "@/lib/wordle/solver";

interface SolverHintButtonProps {
  suggestions: ScoredWord[];
  possibleWordsCount: number;
  disabled?: boolean;
  locale: string;
  onToggle?: (enabled: boolean) => void;
}

export function SolverHintButton({
  suggestions,
  possibleWordsCount,
  disabled,
  locale,
  onToggle,
}: SolverHintButtonProps) {
  const [showHint, setShowHint] = useState(false);
  const isDE = locale === "de";

  useEffect(() => {
    onToggle?.(showHint);
  }, [showHint, onToggle]);

  const handleToggle = () => {
    setShowHint(!showHint);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        disabled={disabled}
        className="gap-2"
      >
        <Lightbulb className="size-4" />
        {isDE ? "Hinweis" : "Hint"}
      </Button>

      {showHint && suggestions.length > 0 && (
        <div className="bg-muted rounded-md p-3 text-sm space-y-2 min-w-[200px]">
          <div className="text-muted-foreground">
            {isDE ? "Verbleibende Wörter" : "Words remaining"}:{" "}
            <span className="font-medium text-foreground">
              {possibleWordsCount}
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground">
              {isDE ? "Beste Vorschläge" : "Best guesses"}:
            </div>
            <ul className="space-y-1">
              {suggestions.slice(0, 3).map((s, i) => (
                <li key={s.word} className="flex items-center justify-between">
                  <span className="font-mono font-medium">
                    {i + 1}. {s.word}
                  </span>
                  {s.isPossibleSolution && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {isDE ? "(möglich)" : "(possible)"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showHint && suggestions.length === 0 && (
        <div className="bg-muted rounded-md p-3 text-sm text-muted-foreground">
          {isDE ? "Lädt..." : "Loading..."}
        </div>
      )}
    </div>
  );
}
