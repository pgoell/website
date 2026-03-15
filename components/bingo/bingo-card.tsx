"use client";

import { Download, Plus, RotateCcw, Shuffle, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PASTEL_COLORS = [
  "bg-pink-300",
  "bg-sky-300",
  "bg-yellow-300",
  "bg-purple-300",
  "bg-green-300",
  "bg-lime-300",
  "bg-rose-300",
  "bg-cyan-300",
  "bg-amber-300",
  "bg-violet-300",
  "bg-emerald-300",
  "bg-fuchsia-300",
];

type Cell = {
  id: string;
  text: string;
  color: string;
  marked: boolean;
};

function getRandomColor(exclude?: string): string {
  const available = exclude
    ? PASTEL_COLORS.filter((c) => c !== exclude)
    : PASTEL_COLORS;
  return available[Math.floor(Math.random() * available.length)] as string;
}

function generateGrid(size: number, items: string[]): Cell[][] {
  const grid: Cell[][] = [];
  let prevColor = "";
  for (let row = 0; row < size; row++) {
    const rowCells: Cell[] = [];
    for (let col = 0; col < size; col++) {
      const index = row * size + col;
      const aboveColor = row > 0 ? (grid[row - 1]?.[col]?.color ?? "") : "";
      const leftColor = col > 0 ? (rowCells[col - 1]?.color ?? "") : "";
      let color = getRandomColor();
      let attempts = 0;
      while (
        (color === aboveColor || color === leftColor || color === prevColor) &&
        attempts < 20
      ) {
        color = getRandomColor();
        attempts++;
      }
      prevColor = color;
      rowCells.push({
        id: `${row}-${col}-${Math.random().toString(36).slice(2, 8)}`,
        text: items[index] || "",
        color,
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
}

export function BingoCard({ locale }: BingoCardProps) {
  const isDE = locale === "de";
  const [size, setSize] = useState(5);
  const [items, setItems] = useState<string[]>(Array(25).fill(""));
  const [grid, setGrid] = useState<Cell[][] | null>(null);
  const [title, setTitle] = useState("");
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const totalCells = size * size;

  const handleSizeChange = (newSize: number) => {
    const newTotal = newSize * newSize;
    setSize(newSize);
    setItems((prev) => {
      if (newTotal > prev.length) {
        return [...prev, ...Array(newTotal - prev.length).fill("")];
      }
      return prev.slice(0, newTotal);
    });
    setGrid(null);
  };

  const handleItemChange = (index: number, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleGenerate = () => {
    setGrid(generateGrid(size, items));
    setEditingCell(null);
  };

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
    setEditingCell(null);
  };

  const handleCellClick = (row: number, col: number) => {
    if (!grid) return;
    setGrid((prev) => {
      if (!prev) return prev;
      const next = prev.map((r) => r.map((c) => ({ ...c })));
      const cell = next[row]?.[col];
      if (cell) cell.marked = !cell.marked;
      return next;
    });
  };

  const handleCellEdit = (row: number, col: number, value: string) => {
    if (!grid) return;
    setGrid((prev) => {
      if (!prev) return prev;
      const next = prev.map((r) => r.map((c) => ({ ...c })));
      const cell = next[row]?.[col];
      if (cell) cell.text = value;
      return next;
    });
    const index = row * size + col;
    handleItemChange(index, value);
  };

  const handleReset = () => {
    setGrid(null);
    setItems(Array(totalCells).fill(""));
    setTitle("");
    setEditingCell(null);
  };

  const handleBulkPaste = (text: string) => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 1) {
      const newItems = Array(totalCells).fill("");
      for (let i = 0; i < Math.min(lines.length, totalCells); i++) {
        newItems[i] = lines[i];
      }
      setItems(newItems);
    }
  };

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(cardRef.current, {
      backgroundColor: "#1a1a2e",
      pixelRatio: 2,
    });
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bingo-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const filledCount = items.slice(0, totalCells).filter(Boolean).length;

  if (!grid) {
    return (
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {isDE ? "Rastergröße" : "Grid Size"}
            </span>
            <div className="flex gap-2">
              {[3, 4, 5].map((s) => (
                <Button
                  key={s}
                  variant={size === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSizeChange(s)}
                >
                  {s}x{s}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="bingo-title">
              {isDE ? "Kartentitel (optional)" : "Card Title (optional)"}
            </label>
            <input
              id="bingo-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isDE ? "z.B. Musik Bingo" : "e.g. Music Bingo"}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">
                {isDE ? "Felder" : "Items"} ({filledCount}/{totalCells})
              </span>
              <span className="text-xs text-muted-foreground">
                {isDE
                  ? "Mehrzeiligen Text einfügen um mehrere Felder zu füllen"
                  : "Paste multi-line text to fill multiple items"}
              </span>
            </div>
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${Math.min(size, 5)}, 1fr)`,
              }}
            >
              {Array.from({ length: totalCells }, (_, i) => {
                const cellId = `input-${size}-${i}`;
                return (
                  <input
                    key={cellId}
                    type="text"
                    value={items[i]}
                    onChange={(e) => handleItemChange(i, e.target.value)}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData("text");
                      if (text.includes("\n")) {
                        e.preventDefault();
                        handleBulkPaste(text);
                      }
                    }}
                    placeholder={`${i + 1}`}
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-center text-xs outline-none focus:ring-2 focus:ring-ring"
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleGenerate}>
            <Plus className="size-4" />
            {isDE ? "Karte erstellen" : "Generate Card"}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="size-4" />
            {isDE ? "Zurücksetzen" : "Reset"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => setGrid(null)}>
          ← {isDE ? "Bearbeiten" : "Edit"}
        </Button>
        <Button variant="outline" onClick={handleShuffle}>
          <Shuffle className="size-4" />
          {isDE ? "Mischen" : "Shuffle"}
        </Button>
        <Button variant="outline" onClick={handleDownload}>
          <Download className="size-4" />
          {isDE ? "Speichern" : "Save Image"}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="size-4" />
          {isDE ? "Neu" : "New"}
        </Button>
      </div>

      <div ref={cardRef} className="rounded-2xl bg-[#1a1a2e] p-4 shadow-lg">
        {title && (
          <h2 className="mb-3 text-center font-bold text-lg text-white tracking-wide">
            {title}
          </h2>
        )}
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        >
          {grid.map((row, rowIdx) =>
            row.map((cell, colIdx) => {
              const isEditing =
                editingCell?.row === rowIdx && editingCell?.col === colIdx;
              return (
                <button
                  type="button"
                  key={cell.id}
                  className={cn(
                    "relative aspect-square rounded-lg flex items-center justify-center p-1 cursor-pointer transition-all select-none border-none",
                    cell.color,
                    cell.marked && "ring-3 ring-white/80 brightness-75",
                  )}
                  onClick={() => {
                    if (isEditing) return;
                    handleCellClick(rowIdx, colIdx);
                  }}
                  onDoubleClick={() =>
                    setEditingCell({ row: rowIdx, col: colIdx })
                  }
                >
                  {cell.marked && (
                    <X className="absolute size-[60%] text-white/90 stroke-[3]" />
                  )}
                  {isEditing ? (
                    <input
                      type="text"
                      value={cell.text}
                      onChange={(e) =>
                        handleCellEdit(rowIdx, colIdx, e.target.value)
                      }
                      onBlur={() => setEditingCell(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setEditingCell(null);
                      }}
                      className="w-full bg-transparent text-center text-xs font-semibold text-gray-900 outline-none"
                    />
                  ) : (
                    <span className="text-center text-[10px] font-semibold leading-tight text-gray-900 sm:text-xs">
                      {cell.text}
                    </span>
                  )}
                </button>
              );
            }),
          )}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {isDE
          ? "Klicken zum Markieren • Doppelklick zum Bearbeiten"
          : "Click to mark • Double-click to edit"}
      </p>
    </div>
  );
}
