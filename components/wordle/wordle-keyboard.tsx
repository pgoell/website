"use client";

import { cva } from "class-variance-authority";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LetterState } from "@/lib/wordle/types";

const keyVariants = cva(
  "flex items-center justify-center font-semibold uppercase rounded transition-colors touch-manipulation select-none",
  {
    variants: {
      state: {
        unused: "bg-muted hover:bg-muted/80 text-foreground",
        correct:
          "bg-[var(--wordle-correct)] text-white dark:text-primary-foreground hover:bg-[var(--wordle-correct)]/90",
        present:
          "bg-[var(--wordle-present)] text-white dark:text-primary-foreground hover:bg-[var(--wordle-present)]/90",
        absent: "bg-muted/50 text-muted-foreground hover:bg-muted/40",
      },
      size: {
        default: "h-14 min-w-[32px] px-1.5 sm:min-w-[43px] sm:px-3 text-sm",
        compact:
          "h-14 min-w-[26px] px-1 sm:min-w-[38px] sm:px-2 text-xs sm:text-sm",
        wide: "h-14 min-w-[44px] px-1.5 sm:min-w-[65px] sm:px-4 text-xs",
      },
    },
    defaultVariants: {
      state: "unused",
      size: "default",
    },
  },
);

// QWERTY layout for English
const KEYBOARD_EN = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
];

// QWERTZ layout for German
const KEYBOARD_DE = [
  ["Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P", "Ü"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ö", "Ä"],
  ["ENTER", "Y", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
];

interface WordleKeyboardProps {
  letterStates: Record<string, LetterState>;
  onKey: (key: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  locale: string;
  disabled?: boolean;
}

export function WordleKeyboard({
  letterStates,
  onKey,
  onEnter,
  onBackspace,
  locale,
  disabled = false,
}: WordleKeyboardProps) {
  const keyboard = locale === "de" ? KEYBOARD_DE : KEYBOARD_EN;
  const isGerman = locale === "de";

  const handleClick = (key: string) => {
    if (disabled) return;
    if (key === "ENTER") {
      onEnter();
    } else if (key === "BACKSPACE") {
      onBackspace();
    } else {
      onKey(key);
    }
  };

  type KeyState = "unused" | "correct" | "present" | "absent";

  const getKeyState = (key: string): KeyState => {
    if (key === "ENTER" || key === "BACKSPACE") return "unused";
    const state = letterStates[key];
    // Map letter states to key states (empty and tbd are not used on keyboard)
    if (state === "correct" || state === "present" || state === "absent") {
      return state;
    }
    return "unused";
  };

  const getKeySize = (key: string) => {
    if (key === "ENTER" || key === "BACKSPACE") return "wide";
    if (isGerman) return "compact";
    return "default";
  };

  return (
    <div className="flex flex-col gap-1.5 w-full max-w-lg">
      {keyboard.map((row) => (
        <div key={row.join("")} className="flex justify-center gap-1">
          {row.map((key) => {
            const state = getKeyState(key);

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleClick(key)}
                disabled={disabled}
                className={cn(
                  keyVariants({
                    state,
                    size: getKeySize(key),
                  }),
                  disabled && "opacity-50 cursor-not-allowed",
                )}
                aria-label={
                  key === "BACKSPACE"
                    ? "Delete"
                    : key === "ENTER"
                      ? "Submit"
                      : key
                }
              >
                {key === "BACKSPACE" ? (
                  <Delete className="size-5" />
                ) : key === "ENTER" ? (
                  "↵"
                ) : (
                  key
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
