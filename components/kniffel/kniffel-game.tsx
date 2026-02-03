"use client";

import { RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGrandTotal, getWinners } from "@/lib/kniffel";
import { KniffelDice } from "./kniffel-dice";
import { KniffelModeSelect } from "./kniffel-mode-select";
import { KniffelPlayerSetup } from "./kniffel-player-setup";
import { KniffelScoreInput } from "./kniffel-score-input";
import { KniffelScorecard } from "./kniffel-scorecard";
import { useKniffel } from "./use-kniffel";

interface KniffelGameProps {
  locale: string;
}

export function KniffelGame({ locale }: KniffelGameProps) {
  const {
    gameState,
    rolling,
    manualScoreInput,
    canRoll,
    selectMode,
    startGame,
    roll,
    toggleDieHold,
    selectCategory,
    openManualScore,
    submitManualScore,
    cancelManualScore,
    resetGame,
  } = useKniffel();

  // Mode selection
  if (gameState.phase === "mode-select") {
    return <KniffelModeSelect onSelectMode={selectMode} locale={locale} />;
  }

  // Player setup
  if (gameState.phase === "setup") {
    return <KniffelPlayerSetup onStart={startGame} locale={locale} />;
  }

  // Game finished
  if (gameState.phase === "finished") {
    const winners = getWinners(gameState.players);
    const winnerNames = winners.map((w) => w.name).join(", ");
    const winnerScore = winners[0] ? getGrandTotal(winners[0]) : 0;

    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="flex flex-col items-center gap-2 p-6 rounded-xl bg-primary/10 border border-primary/20">
          <Trophy className="size-12 text-primary" />
          <h2 className="text-2xl font-bold">
            {locale === "de" ? "Spiel beendet!" : "Game Over!"}
          </h2>
          <p className="text-lg">
            {winners.length > 1 ? (
              locale === "de" ? (
                <>Unentschieden: {winnerNames}</>
              ) : (
                <>Tie: {winnerNames}</>
              )
            ) : (
              <>
                {locale === "de" ? "Gewinner:" : "Winner:"} {winnerNames}
              </>
            )}
          </p>
          <p className="text-muted-foreground">
            {locale === "de" ? "Punktzahl:" : "Score:"} {winnerScore}
          </p>
        </div>

        {gameState.mode && (
          <KniffelScorecard
            players={gameState.players}
            currentPlayerIndex={-1}
            dice={gameState.dice}
            hasRolled={false}
            mode={gameState.mode}
            onSelectCategory={() => {}}
            locale={locale}
          />
        )}

        <Button onClick={resetGame} variant="outline" className="gap-2">
          <RotateCcw className="size-4" />
          {locale === "de" ? "Neues Spiel" : "New Game"}
        </Button>
      </div>
    );
  }

  // Playing
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const turnLabel =
    locale === "de"
      ? `Runde ${gameState.currentTurn}/13`
      : `Turn ${gameState.currentTurn}/13`;

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Current player indicator */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm text-muted-foreground">{turnLabel}</span>
        <h2 className="text-xl font-semibold">
          {gameState.mode === "digital" ? (
            <>
              {currentPlayer?.name}
              {locale === "de" ? " ist dran" : "'s turn"}
            </>
          ) : locale === "de" ? (
            "Punkte eintragen"
          ) : (
            "Enter scores"
          )}
        </h2>
      </div>

      {/* Dice (digital mode only) */}
      {gameState.mode === "digital" && (
        <KniffelDice
          dice={gameState.dice}
          rollsRemaining={gameState.rollsRemaining}
          hasRolled={gameState.hasRolled}
          canRoll={canRoll}
          onRoll={roll}
          onToggleHold={toggleDieHold}
          locale={locale}
          rolling={rolling}
        />
      )}

      {/* Scorecard */}
      {gameState.mode && (
        <KniffelScorecard
          players={gameState.players}
          currentPlayerIndex={gameState.currentPlayerIndex}
          dice={gameState.dice}
          hasRolled={gameState.hasRolled}
          mode={gameState.mode}
          onSelectCategory={selectCategory}
          onManualScore={
            gameState.mode === "tracker" ? openManualScore : undefined
          }
          locale={locale}
        />
      )}

      {/* Reset button */}
      <Button onClick={resetGame} variant="ghost" size="sm" className="gap-2">
        <RotateCcw className="size-4" />
        {locale === "de" ? "Neues Spiel" : "New Game"}
      </Button>

      {/* Manual score input modal */}
      {manualScoreInput && (
        <KniffelScoreInput
          onSubmit={submitManualScore}
          onCancel={cancelManualScore}
          locale={locale}
          initialValue={manualScoreInput.currentScore}
        />
      )}
    </div>
  );
}
