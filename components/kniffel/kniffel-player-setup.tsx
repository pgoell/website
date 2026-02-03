"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface KniffelPlayerSetupProps {
  onStart: (playerNames: string[]) => void;
  locale: string;
}

const MAX_PLAYERS = 12;
const MIN_PLAYERS = 1;

export function KniffelPlayerSetup({
  onStart,
  locale,
}: KniffelPlayerSetupProps) {
  const [playerNames, setPlayerNames] = useState<string[]>([
    locale === "de" ? "Spieler 1" : "Player 1",
  ]);

  const addPlayer = () => {
    if (playerNames.length < MAX_PLAYERS) {
      const num = playerNames.length + 1;
      setPlayerNames([
        ...playerNames,
        locale === "de" ? `Spieler ${num}` : `Player ${num}`,
      ]);
    }
  };

  const removePlayer = () => {
    if (playerNames.length > MIN_PLAYERS) {
      setPlayerNames(playerNames.slice(0, -1));
    }
  };

  const updateName = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const handleStart = () => {
    const validNames = playerNames.map(
      (name, i) =>
        name.trim() ||
        (locale === "de" ? `Spieler ${i + 1}` : `Player ${i + 1}`),
    );
    onStart(validNames);
  };

  const playersLabel = locale === "de" ? "Spieler" : "Players";
  const startLabel = locale === "de" ? "Spiel starten" : "Start Game";

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      <h2 className="text-xl font-semibold">
        {locale === "de" ? "Spieler eingeben" : "Enter Players"}
      </h2>

      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={removePlayer}
          disabled={playerNames.length <= MIN_PLAYERS}
        >
          <Minus className="size-4" />
        </Button>
        <span className="text-lg font-medium min-w-[8rem] text-center">
          {playerNames.length} {playersLabel}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={addPlayer}
          disabled={playerNames.length >= MAX_PLAYERS}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {playerNames.map((name, index) => (
          <input
            // biome-ignore lint/suspicious/noArrayIndexKey: list only adds/removes at end
            key={index}
            type="text"
            value={name}
            onChange={(e) => updateName(index, e.target.value)}
            placeholder={
              locale === "de" ? `Spieler ${index + 1}` : `Player ${index + 1}`
            }
            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        ))}
      </div>

      <Button onClick={handleStart} size="lg" className="w-full">
        {startLabel}
      </Button>
    </div>
  );
}
