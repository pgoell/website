"use client";

import { Dices, Pencil } from "lucide-react";
import type { GameMode } from "@/lib/kniffel";

interface KniffelModeSelectProps {
  onSelectMode: (mode: GameMode) => void;
  locale: string;
}

export function KniffelModeSelect({
  onSelectMode,
  locale,
}: KniffelModeSelectProps) {
  const digitalTitle = locale === "de" ? "Digital" : "Digital";
  const digitalDesc =
    locale === "de"
      ? "Virtuelle Würfel und automatische Punktzählung"
      : "Virtual dice with automatic scoring";

  const trackerTitle = locale === "de" ? "Tracker" : "Tracker";
  const trackerDesc =
    locale === "de"
      ? "Manuelle Eingabe für echte Würfelspiele"
      : "Manual entry for physical dice games";

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-xl font-semibold">
        {locale === "de" ? "Spielmodus wählen" : "Select Game Mode"}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 w-full max-w-md">
        <button
          type="button"
          onClick={() => onSelectMode("digital")}
          className="flex flex-col items-center gap-3 rounded-xl border-2 border-border bg-card p-6 transition-all hover:border-primary hover:bg-primary/5"
        >
          <Dices className="size-12 text-primary" />
          <div className="text-center">
            <h3 className="font-semibold">{digitalTitle}</h3>
            <p className="text-sm text-muted-foreground">{digitalDesc}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode("tracker")}
          className="flex flex-col items-center gap-3 rounded-xl border-2 border-border bg-card p-6 transition-all hover:border-primary hover:bg-primary/5"
        >
          <Pencil className="size-12 text-primary" />
          <div className="text-center">
            <h3 className="font-semibold">{trackerTitle}</h3>
            <p className="text-sm text-muted-foreground">{trackerDesc}</p>
          </div>
        </button>
      </div>
    </div>
  );
}
