import type { TileData } from "@/lib/wordle/types";
import { WordleTile } from "./wordle-tile";

interface WordleRowProps {
  tiles: TileData[];
  shake?: boolean;
  activeTileIndex?: number;
}

export function WordleRow({ tiles, shake, activeTileIndex }: WordleRowProps) {
  return (
    <div className={`flex gap-1.5 ${shake ? "animate-shake" : ""}`}>
      {tiles.map((tile, index) => (
        <WordleTile
          key={`tile-${index}-${tile.letter}`}
          letter={tile.letter}
          state={tile.state}
          isActive={activeTileIndex === index}
        />
      ))}
    </div>
  );
}
