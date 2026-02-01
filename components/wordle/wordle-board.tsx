import type { TileData } from "@/lib/wordle/types";
import { WordleRow } from "./wordle-row";

interface WordleBoardProps {
  rows: TileData[][];
  shakeRow?: number;
  currentRowIndex?: number;
  currentTileIndex?: number;
}

// Pre-defined row IDs since board always has exactly 6 rows
const ROW_IDS = ["row-0", "row-1", "row-2", "row-3", "row-4", "row-5"];

export function WordleBoard({
  rows,
  shakeRow,
  currentRowIndex,
  currentTileIndex,
}: WordleBoardProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row, index) => (
        <WordleRow
          key={ROW_IDS[index]}
          tiles={row}
          shake={shakeRow === index}
          activeTileIndex={
            currentRowIndex === index ? currentTileIndex : undefined
          }
        />
      ))}
    </div>
  );
}
