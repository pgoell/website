"use client";

import { RotateCcw, Shuffle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BINGO_COLORS = [
  "bg-sky-300",
  "bg-pink-300",
  "bg-purple-300",
  "bg-green-300",
  "bg-yellow-300",
];

type Cell = {
  id: string;
  text: string;
  color: string;
  marked: boolean;
};

function buildColorPool(): string[] {
  const pool: string[] = [];
  for (const color of BINGO_COLORS) {
    for (let i = 0; i < 5; i++) {
      pool.push(color);
    }
  }
  return pool;
}

function generateGrid(size: number, items: string[]): Cell[][] {
  return buildGrid(size, items, shuffleArray(buildColorPool()));
}

function buildGrid(size: number, items: string[], colors: string[]): Cell[][] {
  const grid: Cell[][] = [];
  for (let row = 0; row < size; row++) {
    const rowCells: Cell[] = [];
    for (let col = 0; col < size; col++) {
      const index = row * size + col;
      rowCells.push({
        id: `${row}-${col}-${Math.random().toString(36).slice(2, 8)}`,
        text: items[index] || "",
        color: colors[index] ?? (BINGO_COLORS[0] as string),
        marked: false,
      });
    }
    grid.push(rowCells);
  }
  return grid;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i] as T;
    shuffled[i] = shuffled[j] as T;
    shuffled[j] = temp;
  }
  return shuffled;
}

interface BingoCardProps {
  locale: string;
  items?: string[];
  title?: string;
}

export function BingoCard({
  locale,
  items: initialItems,
  title,
}: BingoCardProps) {
  const isDE = locale === "de";
  const size = 5;
  const totalCells = 25;
  const defaultItems = initialItems ?? Array(totalCells).fill("");
  const [items, setItems] = useState<string[]>(defaultItems);
  const [grid, setGrid] = useState<Cell[][]>(() =>
    generateGrid(size, defaultItems),
  );
  const [guess, setGuess] = useState("");

  const handleShuffle = () => {
    const shuffled = shuffleArray(items.slice(0, totalCells));
    setItems((prev) => {
      const next = [...prev];
      for (let i = 0; i < totalCells; i++) {
        next[i] = shuffled[i] ?? "";
      }
      return next;
    });
    setGrid(generateGrid(size, shuffled));
    setGuess("");
  };

  const handleShuffleColors = () => {
    setGrid((prev) => {
      if (!prev) return prev;
      const newColors = shuffleArray(buildColorPool());
      return prev.map((row, rowIdx) =>
        row.map((cell, colIdx) => ({
          ...cell,
          color:
            newColors[rowIdx * size + colIdx] ?? (BINGO_COLORS[0] as string),
        })),
      );
    });
    setGuess("");
  };

  const handleCellClick = (row: number, col: number) => {
    setGrid((prev) => {
      if (!prev) return prev;
      const next = prev.map((r) => r.map((c) => ({ ...c })));
      const cell = next[row]?.[col];
      if (cell) cell.marked = !cell.marked;
      return next;
    });
  };

  const handleReset = () => {
    setGrid(generateGrid(size, items));
    setGuess("");
  };

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder={isDE ? "Tipp eingeben…" : "Enter your guess…"}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button variant="outline" onClick={() => setGuess("")} disabled={!guess}>
          <X className="size-4" />
          {isDE ? "Leeren" : "Clear"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={handleShuffle}>
          <Shuffle className="size-4" />
          {isDE ? "Mischen" : "Shuffle"}
        </Button>
        <Button variant="outline" onClick={handleShuffleColors}>
          <RotateCcw className="size-4" />
          {isDE ? "Farben mischen" : "Shuffle Colors"}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <X className="size-4" />
          {isDE ? "Zurücksetzen" : "Reset"}
        </Button>
      </div>

      <div className="rounded-2xl bg-card p-4 shadow-lg border border-border">
        {title && (
          <h2 className="mb-3 text-center font-bold text-lg text-card-foreground tracking-wide">
            {title}
          </h2>
        )}
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        >
          {grid.map((row, rowIdx) =>
            row.map((cell, colIdx) => (
              <button
                type="button"
                key={cell.id}
                className={cn(
                  "relative aspect-square rounded-lg flex items-center justify-center p-1 cursor-pointer transition-all select-none border-none",
                  cell.color,
                  cell.marked && "ring-3 ring-white/80 brightness-75",
                )}
                onClick={() => handleCellClick(rowIdx, colIdx)}
              >
                {cell.marked && (
                  <X className="absolute size-[60%] text-white/90 stroke-[3]" />
                )}
                <span className="text-center text-[10px] font-semibold leading-tight text-gray-900 sm:text-xs">
                  {cell.text}
                </span>
              </button>
            )),
          )}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {isDE ? "Klicken zum Markieren" : "Click to mark"}
      </p>
    </div>
  );
}
