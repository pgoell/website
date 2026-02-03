"use client";

import {
  calculateScore,
  type DieState,
  type GameMode,
  getGrandTotal,
  getLowerTotal,
  getUpperBonus,
  getUpperTotal,
  LOWER_CATEGORIES,
  type Player,
  type ScoreCategory,
  UPPER_CATEGORIES,
} from "@/lib/kniffel";
import { cn } from "@/lib/utils";

interface KniffelScorecardProps {
  players: Player[];
  currentPlayerIndex: number;
  dice: DieState[];
  hasRolled: boolean;
  mode: GameMode;
  onSelectCategory: (category: ScoreCategory) => void;
  onManualScore?: (playerId: string, category: ScoreCategory) => void;
  locale: string;
}

const categoryLabels: Record<ScoreCategory, { en: string; de: string }> = {
  ones: { en: "Ones", de: "Einser" },
  twos: { en: "Twos", de: "Zweier" },
  threes: { en: "Threes", de: "Dreier" },
  fours: { en: "Fours", de: "Vierer" },
  fives: { en: "Fives", de: "Fünfer" },
  sixes: { en: "Sixes", de: "Sechser" },
  threeOfAKind: { en: "Three of a Kind", de: "Dreierpasch" },
  fourOfAKind: { en: "Four of a Kind", de: "Viererpasch" },
  fullHouse: { en: "Full House", de: "Full House" },
  smallStraight: { en: "Small Straight", de: "Kleine Straße" },
  largeStraight: { en: "Large Straight", de: "Große Straße" },
  kniffel: { en: "Kniffel", de: "Kniffel" },
  chance: { en: "Chance", de: "Chance" },
};

interface ScoreCellProps {
  player: Player;
  category: ScoreCategory;
  isCurrentPlayer: boolean;
  potentialScore: number | null;
  mode: GameMode;
  hasRolled: boolean;
  onSelect: () => void;
  onManualScore?: () => void;
}

function ScoreCell({
  player,
  category,
  isCurrentPlayer,
  potentialScore,
  mode,
  hasRolled,
  onSelect,
  onManualScore,
}: ScoreCellProps) {
  const score = player.scores[category];
  const isFilled = score !== null;
  const canSelect =
    mode === "digital" && isCurrentPlayer && hasRolled && !isFilled;
  // In tracker mode, allow editing both filled and unfilled cells
  const canManualEdit = mode === "tracker";

  const handleClick = () => {
    if (canSelect) {
      onSelect();
    } else if (canManualEdit && onManualScore) {
      onManualScore();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const isInteractive = canSelect || canManualEdit;

  // Only show current player highlight in digital mode
  const showCurrentHighlight =
    mode === "digital" && isCurrentPlayer && !isFilled;

  return (
    <td
      className={cn(
        "border border-border px-2 py-1 text-center min-w-[3rem]",
        canSelect && "cursor-pointer hover:bg-primary/10 bg-primary/5",
        canManualEdit && !isFilled && "cursor-pointer hover:bg-muted/50",
        canManualEdit && isFilled && "cursor-pointer hover:bg-muted/30",
        showCurrentHighlight && "bg-accent/30",
        isInteractive &&
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
      )}
      onClick={handleClick}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      role={isInteractive ? "button" : undefined}
    >
      {isFilled ? (
        <span className="font-medium">{score}</span>
      ) : canSelect && potentialScore !== null ? (
        <span className="text-muted-foreground">{potentialScore}</span>
      ) : (
        <span className="text-muted-foreground/50">-</span>
      )}
    </td>
  );
}

export function KniffelScorecard({
  players,
  currentPlayerIndex,
  dice,
  hasRolled,
  mode,
  onSelectCategory,
  onManualScore,
  locale,
}: KniffelScorecardProps) {
  const t = (key: ScoreCategory) =>
    locale === "de" ? categoryLabels[key].de : categoryLabels[key].en;

  const upperSubtotalLabel = locale === "de" ? "Zwischensumme" : "Subtotal";
  const bonusLabel = locale === "de" ? "Bonus (≥63)" : "Bonus (≥63)";
  const upperTotalLabel = locale === "de" ? "Oberer Teil" : "Upper Total";
  const lowerTotalLabel = locale === "de" ? "Unterer Teil" : "Lower Total";
  const grandTotalLabel = locale === "de" ? "Gesamtsumme" : "Grand Total";

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="border border-border px-3 py-2 text-left font-semibold min-w-[8rem]">
              {locale === "de" ? "Kategorie" : "Category"}
            </th>
            {players.map((player, idx) => (
              <th
                key={player.id}
                className={cn(
                  "border border-border px-3 py-2 text-center font-semibold min-w-[4rem]",
                  idx === currentPlayerIndex &&
                    mode === "digital" &&
                    "bg-primary/20",
                )}
              >
                {player.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Upper Section */}
          {UPPER_CATEGORIES.map((category) => (
            <tr key={category}>
              <td className="border border-border px-3 py-1 font-medium">
                {t(category)}
              </td>
              {players.map((player, idx) => (
                <ScoreCell
                  key={player.id}
                  player={player}
                  category={category}
                  isCurrentPlayer={idx === currentPlayerIndex}
                  potentialScore={
                    hasRolled && idx === currentPlayerIndex
                      ? calculateScore(category, dice)
                      : null
                  }
                  mode={mode}
                  hasRolled={hasRolled}
                  onSelect={() => onSelectCategory(category)}
                  onManualScore={
                    onManualScore
                      ? () => onManualScore(player.id, category)
                      : undefined
                  }
                />
              ))}
            </tr>
          ))}

          {/* Upper Section Totals */}
          <tr className="bg-muted/30">
            <td className="border border-border px-3 py-1 font-medium">
              {upperSubtotalLabel}
            </td>
            {players.map((player) => (
              <td
                key={player.id}
                className="border border-border px-2 py-1 text-center font-medium"
              >
                {getUpperTotal(player)}
              </td>
            ))}
          </tr>
          <tr className="bg-muted/30">
            <td className="border border-border px-3 py-1 font-medium">
              {bonusLabel}
            </td>
            {players.map((player) => (
              <td
                key={player.id}
                className="border border-border px-2 py-1 text-center font-medium"
              >
                {getUpperBonus(player)}
              </td>
            ))}
          </tr>
          <tr className="bg-muted/50">
            <td className="border border-border px-3 py-1 font-semibold">
              {upperTotalLabel}
            </td>
            {players.map((player) => (
              <td
                key={player.id}
                className="border border-border px-2 py-1 text-center font-semibold"
              >
                {getUpperTotal(player) + getUpperBonus(player)}
              </td>
            ))}
          </tr>

          {/* Separator */}
          <tr>
            <td colSpan={players.length + 1} className="h-2" />
          </tr>

          {/* Lower Section */}
          {LOWER_CATEGORIES.map((category) => (
            <tr key={category}>
              <td className="border border-border px-3 py-1 font-medium">
                {t(category)}
              </td>
              {players.map((player, idx) => (
                <ScoreCell
                  key={player.id}
                  player={player}
                  category={category}
                  isCurrentPlayer={idx === currentPlayerIndex}
                  potentialScore={
                    hasRolled && idx === currentPlayerIndex
                      ? calculateScore(category, dice)
                      : null
                  }
                  mode={mode}
                  hasRolled={hasRolled}
                  onSelect={() => onSelectCategory(category)}
                  onManualScore={
                    onManualScore
                      ? () => onManualScore(player.id, category)
                      : undefined
                  }
                />
              ))}
            </tr>
          ))}

          {/* Lower Section Total */}
          <tr className="bg-muted/50">
            <td className="border border-border px-3 py-1 font-semibold">
              {lowerTotalLabel}
            </td>
            {players.map((player) => (
              <td
                key={player.id}
                className="border border-border px-2 py-1 text-center font-semibold"
              >
                {getLowerTotal(player)}
              </td>
            ))}
          </tr>

          {/* Grand Total */}
          <tr className="bg-primary/10">
            <td className="border border-border px-3 py-2 font-bold">
              {grandTotalLabel}
            </td>
            {players.map((player) => (
              <td
                key={player.id}
                className="border border-border px-2 py-2 text-center font-bold text-lg"
              >
                {getGrandTotal(player)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
