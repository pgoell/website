import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { LetterState } from "@/lib/wordle/types";

const tileVariants = cva(
  "flex items-center justify-center text-2xl font-bold uppercase select-none border-2 transition-all duration-300",
  {
    variants: {
      state: {
        empty: "border-border bg-transparent",
        tbd: "border-muted-foreground bg-transparent",
        correct:
          "border-transparent bg-[var(--wordle-correct)] text-white dark:text-primary-foreground",
        present:
          "border-transparent bg-[var(--wordle-present)] text-white dark:text-primary-foreground",
        absent: "border-transparent bg-muted text-muted-foreground",
      },
      size: {
        default: "size-14 sm:size-16 text-2xl sm:text-3xl",
        small: "size-10 sm:size-12 text-lg sm:text-xl",
      },
    },
    defaultVariants: {
      state: "empty",
      size: "default",
    },
  },
);

interface WordleTileProps extends VariantProps<typeof tileVariants> {
  letter: string;
  state: LetterState;
  isActive?: boolean;
  className?: string;
}

export function WordleTile({
  letter,
  state,
  size,
  isActive,
  className,
}: WordleTileProps) {
  return (
    <div
      className={cn(
        tileVariants({ state, size, className }),
        isActive && "border-primary ring-2 ring-primary/30",
      )}
    >
      {letter}
    </div>
  );
}
