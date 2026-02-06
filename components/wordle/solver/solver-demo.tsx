"use client";

import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TileData } from "@/lib/wordle";
import { evaluateGuess, getRandomWord, MAX_GUESSES } from "@/lib/wordle";
import {
  createSolverState,
  getBestOpeningWord,
  getFeedbackPattern,
  getRankedGuesses,
  type SolverState,
  updateSolverState,
} from "@/lib/wordle/solver";
import { WordleBoard } from "../wordle-board";

interface SolverDemoProps {
  wordList: string[];
}

type DemoStatus = "ready" | "solving" | "solved" | "failed";

const SPEEDS = [
  { label: "Slow", ms: 1500 },
  { label: "Normal", ms: 800 },
  { label: "Fast", ms: 400 },
] as const;

const DEFAULT_SPEED = SPEEDS[1];

export function SolverDemo({ wordList }: SolverDemoProps) {
  const t = useTranslations("games.wordle.solver");

  const [solution, setSolution] = useState(() => getRandomWord(wordList));
  const [guesses, setGuesses] = useState<string[]>([]);
  const [solverState, setSolverState] = useState<SolverState>(() =>
    createSolverState(wordList),
  );
  const [status, setStatus] = useState<DemoStatus>("ready");
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSpeed = SPEEDS[speedIndex] ?? DEFAULT_SPEED;

  // Build board rows from guesses
  const boardRows: TileData[][] = [];
  for (const guess of guesses) {
    boardRows.push(evaluateGuess(guess, solution));
  }
  // Fill remaining rows
  while (boardRows.length < MAX_GUESSES) {
    boardRows.push(
      Array.from({ length: 5 }, () => ({
        letter: "",
        state: "empty" as const,
      })),
    );
  }

  const makeGuess = useCallback(() => {
    if (status === "solved" || status === "failed") return;
    if (guesses.length >= MAX_GUESSES) {
      setStatus("failed");
      setIsPlaying(false);
      return;
    }

    // Get best guess
    let guess: string;
    if (guesses.length === 0) {
      guess = getBestOpeningWord(wordList);
    } else {
      const suggestions = getRankedGuesses(solverState, wordList, 1);
      if (suggestions.length === 0 || !suggestions[0]) {
        setStatus("failed");
        setIsPlaying(false);
        return;
      }
      guess = suggestions[0].word;
    }

    // Check if solved
    if (guess.toUpperCase() === solution.toUpperCase()) {
      setGuesses((prev) => [...prev, guess]);
      setStatus("solved");
      setIsPlaying(false);
      return;
    }

    // Update state
    const pattern = getFeedbackPattern(guess, solution);
    const newState = updateSolverState(solverState, guess, pattern);

    setGuesses((prev) => [...prev, guess]);
    setSolverState(newState);
    setStatus("solving");
  }, [guesses, solverState, solution, status, wordList]);

  // Auto-play timer
  useEffect(() => {
    if (isPlaying && status !== "solved" && status !== "failed") {
      timerRef.current = setTimeout(makeGuess, currentSpeed.ms);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPlaying, status, makeGuess, currentSpeed.ms]);

  const handlePlay = () => {
    if (status === "ready") {
      setStatus("solving");
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleStep = () => {
    if (status === "ready") {
      setStatus("solving");
    }
    setIsPlaying(false);
    makeGuess();
  };

  const handleReset = () => {
    setIsPlaying(false);
    const newSolution = getRandomWord(wordList);
    setSolution(newSolution);
    setGuesses([]);
    setSolverState(createSolverState(wordList));
    setStatus("ready");
  };

  const cycleSpeed = () => {
    setSpeedIndex((i) => (i + 1) % SPEEDS.length);
  };

  const getStatusText = () => {
    switch (status) {
      case "ready":
        return t("status.ready");
      case "solving":
        return `${t("status.solving")} (${solverState.possibleWords.length})`;
      case "solved":
        return t("status.solved", { count: guesses.length });
      case "failed":
        return t("failed", { word: solution });
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Status display */}
      <div className="h-8 flex items-center justify-center">
        <div
          className={`px-4 py-1.5 rounded-md text-sm font-medium ${
            status === "solved"
              ? "bg-[var(--wordle-correct)] text-white dark:text-primary-foreground"
              : status === "failed"
                ? "bg-destructive text-destructive-foreground"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {getStatusText()}
        </div>
      </div>

      {/* Game board */}
      <WordleBoard rows={boardRows} />

      {/* Controls */}
      <div className="flex items-center gap-2">
        {!isPlaying ? (
          <Button
            onClick={handlePlay}
            variant="outline"
            size="sm"
            disabled={status === "solved" || status === "failed"}
            className="gap-2"
          >
            <Play className="size-4" />
            {t("controls.play")}
          </Button>
        ) : (
          <Button
            onClick={handlePause}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Pause className="size-4" />
            {t("controls.pause")}
          </Button>
        )}

        <Button
          onClick={handleStep}
          variant="outline"
          size="sm"
          disabled={isPlaying || status === "solved" || status === "failed"}
          className="gap-2"
        >
          <SkipForward className="size-4" />
          {t("controls.step")}
        </Button>

        <Button
          onClick={handleReset}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RotateCcw className="size-4" />
          {t("controls.reset")}
        </Button>

        <Button
          onClick={cycleSpeed}
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        >
          {currentSpeed.label}
        </Button>
      </div>

      {/* Solution reveal (when game is over) */}
      {(status === "solved" || status === "failed") && (
        <div className="text-sm text-muted-foreground">
          {t("solution")}:{" "}
          <span className="font-mono font-bold">{solution}</span>
        </div>
      )}
    </div>
  );
}
