"use client";

import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DieState } from "@/lib/kniffel";
import { KniffelDie } from "./kniffel-die";

interface KniffelDiceProps {
  dice: DieState[];
  rollsRemaining: number;
  hasRolled: boolean;
  canRoll: boolean;
  onRoll: () => void;
  onToggleHold: (index: number) => void;
  locale: string;
  rolling?: boolean;
}

export function KniffelDice({
  dice,
  rollsRemaining,
  hasRolled,
  canRoll,
  onRoll,
  onToggleHold,
  locale,
  rolling = false,
}: KniffelDiceProps) {
  const rollText = locale === "de" ? "Würfeln" : "Roll";
  const rollsText =
    locale === "de"
      ? `${rollsRemaining} ${rollsRemaining === 1 ? "Wurf" : "Würfe"} übrig`
      : `${rollsRemaining} roll${rollsRemaining === 1 ? "" : "s"} left`;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2 sm:gap-3">
        {dice.map((die, index) => (
          <KniffelDie
            // biome-ignore lint/suspicious/noArrayIndexKey: dice array is fixed length (5) and never reordered
            key={index}
            value={die.value}
            held={die.held}
            disabled={!hasRolled}
            onClick={() => onToggleHold(index)}
            rolling={rolling && !die.held}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-2">
        <Button onClick={onRoll} disabled={!canRoll} className="gap-2">
          <Dices className="size-4" />
          {rollText}
        </Button>
        <span className="text-sm text-muted-foreground">{rollsText}</span>
      </div>
    </div>
  );
}
