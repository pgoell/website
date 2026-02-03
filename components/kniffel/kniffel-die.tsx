"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const dieVariants = cva(
  "relative flex items-center justify-center rounded-lg border-2 transition-all duration-200 select-none",
  {
    variants: {
      state: {
        default: "border-border bg-card hover:border-primary cursor-pointer",
        held: "border-primary bg-primary/10 ring-2 ring-primary/30 cursor-pointer",
        disabled: "border-muted bg-muted/50 cursor-default opacity-60",
      },
      size: {
        default: "size-12 sm:size-14 text-xl sm:text-2xl",
        small: "size-10 sm:size-12 text-lg sm:text-xl",
      },
    },
    defaultVariants: {
      state: "default",
      size: "default",
    },
  },
);

interface KniffelDieProps extends VariantProps<typeof dieVariants> {
  value: number;
  held?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  rolling?: boolean;
}

const dotPositions: Record<number, number[][]> = {
  1: [[50, 50]],
  2: [
    [25, 25],
    [75, 75],
  ],
  3: [
    [25, 25],
    [50, 50],
    [75, 75],
  ],
  4: [
    [25, 25],
    [75, 25],
    [25, 75],
    [75, 75],
  ],
  5: [
    [25, 25],
    [75, 25],
    [50, 50],
    [25, 75],
    [75, 75],
  ],
  6: [
    [25, 25],
    [75, 25],
    [25, 50],
    [75, 50],
    [25, 75],
    [75, 75],
  ],
};

export function KniffelDie({
  value,
  held = false,
  disabled = false,
  onClick,
  size,
  className,
  rolling = false,
}: KniffelDieProps) {
  const state = disabled ? "disabled" : held ? "held" : "default";
  const dots = dotPositions[value] || [];

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        dieVariants({ state, size, className }),
        rolling && "animate-pulse",
      )}
      aria-label={`Die showing ${value}${held ? ", held" : ""}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full p-2"
        aria-hidden="true"
      >
        {dots.map(([cx, cy]) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r="10"
            className={cn(
              "transition-colors",
              held ? "fill-primary" : "fill-foreground",
            )}
          />
        ))}
      </svg>
    </button>
  );
}
