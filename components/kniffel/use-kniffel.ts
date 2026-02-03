"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ALL_CATEGORIES,
  calculateScore,
  createInitialDice,
  type GameMode,
  type GameState,
  isPlayerComplete,
  MAX_ROLLS,
  type Player,
  resetHolds,
  rollDice,
  type ScoreCategory,
  type StoredGameState,
  toggleHold,
} from "@/lib/kniffel";

const STORAGE_KEY = "kniffel-state";

function createEmptyScores(): Record<ScoreCategory, number | null> {
  return Object.fromEntries(ALL_CATEGORIES.map((cat) => [cat, null])) as Record<
    ScoreCategory,
    number | null
  >;
}

function createPlayer(id: string, name: string): Player {
  return {
    id,
    name,
    scores: createEmptyScores(),
  };
}

function createInitialState(): GameState {
  return {
    mode: null,
    phase: "mode-select",
    players: [],
    currentPlayerIndex: 0,
    currentTurn: 1,
    dice: createInitialDice(),
    rollsRemaining: MAX_ROLLS,
    hasRolled: false,
  };
}

function loadGameState(): StoredGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as StoredGameState;
  } catch {
    return null;
  }
}

function saveGameState(state: GameState): void {
  if (typeof window === "undefined") return;
  if (state.phase === "mode-select" || !state.mode) {
    clearGameState();
    return;
  }
  try {
    const toStore: StoredGameState = {
      mode: state.mode,
      phase: state.phase,
      players: state.players,
      currentPlayerIndex: state.currentPlayerIndex,
      currentTurn: state.currentTurn,
      dice: state.dice,
      rollsRemaining: state.rollsRemaining,
      hasRolled: state.hasRolled,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // Ignore storage errors
  }
}

function clearGameState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function useKniffel() {
  const [gameState, setGameState] = useState<GameState>(() => {
    const stored = loadGameState();
    if (stored && stored.phase !== "mode-select") {
      return {
        mode: stored.mode,
        phase: stored.phase,
        players: stored.players,
        currentPlayerIndex: stored.currentPlayerIndex,
        currentTurn: stored.currentTurn,
        dice: stored.dice,
        rollsRemaining: stored.rollsRemaining,
        hasRolled: stored.hasRolled,
      };
    }
    return createInitialState();
  });

  const [rolling, setRolling] = useState(false);
  const [manualScoreInput, setManualScoreInput] = useState<{
    playerId: string;
    category: ScoreCategory;
    currentScore: number | null;
  } | null>(null);

  // Save state on changes
  useEffect(() => {
    saveGameState(gameState);
  }, [gameState]);

  const selectMode = useCallback((mode: GameMode) => {
    setGameState((prev) => ({
      ...prev,
      mode,
      phase: "setup",
    }));
  }, []);

  const startGame = useCallback((playerNames: string[]) => {
    const players = playerNames.map((name, i) =>
      createPlayer(`player-${i}`, name),
    );
    setGameState((prev) => ({
      ...prev,
      phase: "playing",
      players,
      currentPlayerIndex: 0,
      currentTurn: 1,
      dice: createInitialDice(),
      rollsRemaining: MAX_ROLLS,
      hasRolled: false,
    }));
  }, []);

  const roll = useCallback(() => {
    if (gameState.rollsRemaining <= 0 || gameState.phase !== "playing") return;
    if (gameState.mode !== "digital") return;

    setRolling(true);
    setTimeout(() => {
      setGameState((prev) => ({
        ...prev,
        dice: rollDice(prev.dice),
        rollsRemaining: prev.rollsRemaining - 1,
        hasRolled: true,
      }));
      setRolling(false);
    }, 300);
  }, [gameState.rollsRemaining, gameState.phase, gameState.mode]);

  const toggleDieHold = useCallback(
    (index: number) => {
      if (!gameState.hasRolled || gameState.phase !== "playing") return;
      if (gameState.mode !== "digital") return;

      setGameState((prev) => ({
        ...prev,
        dice: toggleHold(prev.dice, index),
      }));
    },
    [gameState.hasRolled, gameState.phase, gameState.mode],
  );

  const selectCategory = useCallback(
    (category: ScoreCategory) => {
      if (!gameState.hasRolled || gameState.phase !== "playing") return;
      if (gameState.mode !== "digital") return;

      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.scores[category] !== null) return;

      const score = calculateScore(category, gameState.dice);

      setGameState((prev) => {
        const playerToUpdate = prev.players[prev.currentPlayerIndex];
        if (!playerToUpdate) return prev;

        const newPlayers = [...prev.players];
        newPlayers[prev.currentPlayerIndex] = {
          ...playerToUpdate,
          scores: {
            ...playerToUpdate.scores,
            [category]: score,
          },
        };

        // Check if game is finished
        const allComplete = newPlayers.every(isPlayerComplete);
        if (allComplete) {
          return {
            ...prev,
            players: newPlayers,
            phase: "finished",
          };
        }

        // Move to next player or next turn
        const nextPlayerIndex =
          (prev.currentPlayerIndex + 1) % prev.players.length;
        const nextTurn =
          nextPlayerIndex === 0 ? prev.currentTurn + 1 : prev.currentTurn;

        return {
          ...prev,
          players: newPlayers,
          currentPlayerIndex: nextPlayerIndex,
          currentTurn: nextTurn,
          dice: resetHolds(createInitialDice()),
          rollsRemaining: MAX_ROLLS,
          hasRolled: false,
        };
      });
    },
    [
      gameState.hasRolled,
      gameState.phase,
      gameState.mode,
      gameState.players,
      gameState.currentPlayerIndex,
      gameState.dice,
    ],
  );

  const openManualScore = useCallback(
    (playerId: string, category: ScoreCategory) => {
      if (gameState.mode !== "tracker") return;
      const player = gameState.players.find((p) => p.id === playerId);
      const currentScore = player?.scores[category] ?? null;
      setManualScoreInput({ playerId, category, currentScore });
    },
    [gameState.mode, gameState.players],
  );

  const submitManualScore = useCallback(
    (score: number) => {
      if (!manualScoreInput) return;

      setGameState((prev) => {
        const playerIndex = prev.players.findIndex(
          (p) => p.id === manualScoreInput.playerId,
        );
        if (playerIndex === -1) return prev;

        const playerToUpdate = prev.players[playerIndex];
        if (!playerToUpdate) return prev;

        const newPlayers = [...prev.players];
        newPlayers[playerIndex] = {
          ...playerToUpdate,
          scores: {
            ...playerToUpdate.scores,
            [manualScoreInput.category]: score,
          },
        };

        const allComplete = newPlayers.every(isPlayerComplete);

        return {
          ...prev,
          players: newPlayers,
          phase: allComplete ? "finished" : prev.phase,
        };
      });

      setManualScoreInput(null);
    },
    [manualScoreInput],
  );

  const cancelManualScore = useCallback(() => {
    setManualScoreInput(null);
  }, []);

  const resetGame = useCallback(() => {
    clearGameState();
    setGameState(createInitialState());
    setManualScoreInput(null);
  }, []);

  const canRoll =
    gameState.mode === "digital" &&
    gameState.phase === "playing" &&
    gameState.rollsRemaining > 0;

  return {
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
  };
}
