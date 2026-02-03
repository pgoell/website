"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_GUESSES, WORD_LENGTH } from "@/lib/wordle/constants";
import {
  evaluateGuess,
  getKeyboardLayout,
  getKeyboardState,
  getWordSet,
  getWords,
  isAllowedLetter,
  type LetterStatus,
  normalizeChar,
  pickAnswer,
} from "@/lib/wordle/logic";

type GameStatus = "playing" | "won" | "lost";

type StoredState = {
  answer: string;
  guesses: string[];
  currentGuess: string;
  status: GameStatus;
};

function storageKey(locale: string) {
  return `wordle:${locale}`;
}

function isValidStoredState(
  value: unknown,
  wordSet: Set<string>,
  locale: string,
) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Partial<StoredState>;
  if (
    typeof data.answer !== "string" ||
    !wordSet.has(data.answer) ||
    !Array.isArray(data.guesses) ||
    typeof data.currentGuess !== "string" ||
    !["playing", "won", "lost"].includes(data.status ?? "")
  ) {
    return false;
  }

  if (data.guesses.length > MAX_GUESSES) {
    return false;
  }

  const currentLetters = Array.from(data.currentGuess);
  if (currentLetters.length > WORD_LENGTH) {
    return false;
  }

  if (
    currentLetters.some((letter) => !isAllowedLetter(letter, locale)) ||
    data.guesses.some((guess) => !wordSet.has(guess))
  ) {
    return false;
  }

  return true;
}

function tileClasses(status: LetterStatus | undefined, filled: boolean) {
  return cn(
    "flex h-12 w-12 items-center justify-center rounded-md border text-lg font-semibold uppercase shadow-xs transition-colors sm:h-14 sm:w-14",
    status === "correct" && "border-primary bg-primary text-primary-foreground",
    status === "present" &&
      "border-secondary bg-secondary text-secondary-foreground",
    status === "absent" && "border-muted/60 bg-muted text-muted-foreground",
    !status && filled && "border-foreground/20 bg-card",
    !status && !filled && "border-border bg-transparent",
  );
}

function keyClasses(status: LetterStatus | undefined, action = false) {
  return cn(
    "h-10 rounded-md px-2 text-xs font-semibold uppercase shadow-xs transition-colors sm:text-sm",
    action ? "min-w-[4.5rem]" : "min-w-[2.25rem]",
    status === "correct" &&
      "bg-primary text-primary-foreground hover:bg-primary/90",
    status === "present" &&
      "bg-secondary text-secondary-foreground hover:bg-secondary/90",
    status === "absent" && "bg-muted text-muted-foreground hover:bg-muted/80",
    !status && "bg-card text-foreground hover:bg-accent",
  );
}

export function WordleGame() {
  const t = useTranslations("wordle");
  const locale = useLocale();

  const words = useMemo(() => getWords(locale), [locale]);
  const wordSet = useMemo(() => getWordSet(locale), [locale]);
  const keyboardLayout = useMemo(() => getKeyboardLayout(locale), [locale]);

  const [answer, setAnswer] = useState<string>(() => pickAnswer(words));
  const [guesses, setGuesses] = useState<string[]>([]);
  const [evaluations, setEvaluations] = useState<LetterStatus[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [status, setStatus] = useState<GameStatus>("playing");
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);

  const resetGame = useCallback(() => {
    setAnswer(pickAnswer(words));
    setGuesses([]);
    setEvaluations([]);
    setCurrentGuess("");
    setStatus("playing");
    setMessage("");
  }, [words]);

  useEffect(() => {
    setLoaded(false);
    const key = storageKey(locale);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (isValidStoredState(parsed, wordSet, locale)) {
          const evaluationsFromStorage = parsed.guesses.map((guess: string) =>
            evaluateGuess(guess, parsed.answer),
          );
          setAnswer(parsed.answer);
          setGuesses(parsed.guesses);
          setEvaluations(evaluationsFromStorage);
          setCurrentGuess(parsed.currentGuess);
          setStatus(parsed.status);
          setMessage("");
          setLoaded(true);
          return;
        }
      } catch {
        // ignore malformed storage
      }
    }

    resetGame();
    setLoaded(true);
  }, [locale, resetGame, wordSet]);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const payload: StoredState = {
      answer,
      guesses,
      currentGuess,
      status,
    };
    localStorage.setItem(storageKey(locale), JSON.stringify(payload));
  }, [answer, currentGuess, guesses, loaded, locale, status]);

  const keyboardState = useMemo(
    () => getKeyboardState(guesses, evaluations),
    [evaluations, guesses],
  );

  const handleBackspace = useCallback(() => {
    setCurrentGuess((prev) => {
      const letters = Array.from(prev);
      letters.pop();
      return letters.join("");
    });
    setMessage("");
  }, []);

  const handleSubmit = useCallback(() => {
    if (status !== "playing") {
      return;
    }

    const letters = Array.from(currentGuess);
    if (letters.length < WORD_LENGTH) {
      setMessage(t("tooShort"));
      return;
    }

    if (!wordSet.has(currentGuess)) {
      setMessage(t("invalidWord"));
      return;
    }

    const evaluation = evaluateGuess(currentGuess, answer);
    const nextGuesses = [...guesses, currentGuess];
    const nextEvaluations = [...evaluations, evaluation];

    setGuesses(nextGuesses);
    setEvaluations(nextEvaluations);
    setCurrentGuess("");
    setMessage("");

    if (currentGuess === answer) {
      setStatus("won");
      return;
    }

    if (nextGuesses.length >= MAX_GUESSES) {
      setStatus("lost");
    }
  }, [answer, currentGuess, evaluations, guesses, status, t, wordSet]);

  const handleKey = useCallback(
    (key: string) => {
      if (status !== "playing") {
        return;
      }

      if (key === "ENTER") {
        handleSubmit();
        return;
      }

      if (key === "BACKSPACE") {
        handleBackspace();
        return;
      }

      if (key.length !== 1) {
        return;
      }

      const normalized = normalizeChar(key, locale);
      if (!normalized || !isAllowedLetter(normalized, locale)) {
        return;
      }

      setCurrentGuess((prev) => {
        const letters = Array.from(prev);
        if (letters.length >= WORD_LENGTH) {
          return prev;
        }
        return `${prev}${normalized}`;
      });
      setMessage("");
    },
    [handleBackspace, handleSubmit, locale, status],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        handleKey("ENTER");
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        handleKey("BACKSPACE");
        return;
      }

      if (event.key.length === 1) {
        handleKey(event.key);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  const statusMessage =
    status === "won"
      ? t("win")
      : status === "lost"
        ? t("lose", { answer })
        : message;

  const activeRow = guesses.length;
  const rowIds = Array.from(
    { length: MAX_GUESSES },
    (_, index) => `row-${index + 1}`,
  );
  const tileIds = Array.from(
    { length: WORD_LENGTH },
    (_, index) => `tile-${index + 1}`,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
        <div className="grid gap-2">
          {rowIds.map((rowId, rowIndex) => {
            const guess =
              guesses[rowIndex] ?? (rowIndex === activeRow ? currentGuess : "");
            const letters = Array.from(guess);
            const evaluation = evaluations[rowIndex] ?? [];

            return (
              <div key={rowId} className="grid grid-cols-5 gap-2">
                {tileIds.map((tileId, letterIndex) => {
                  const letter = letters[letterIndex] ?? "";
                  const statusForTile = evaluation[letterIndex];
                  return (
                    <div
                      key={`${rowId}-${tileId}`}
                      className={tileClasses(statusForTile, Boolean(letter))}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="min-h-[1.5rem] text-sm text-muted-foreground"
        aria-live="polite"
      >
        {statusMessage}
      </div>

      <div className="space-y-2">
        {keyboardLayout.map((row) => (
          <div
            key={row.join("-")}
            className="flex flex-wrap justify-center gap-2"
          >
            {row.map((key) => {
              const isAction = key === "ENTER" || key === "BACKSPACE";
              return (
                <button
                  key={key}
                  type="button"
                  className={keyClasses(
                    isAction ? undefined : keyboardState[key],
                    isAction,
                  )}
                  onClick={() => handleKey(key)}
                  disabled={status !== "playing"}
                >
                  {key === "BACKSPACE" ? "Backspace" : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={resetGame}>{t("newGame")}</Button>
        <div className="text-xs text-muted-foreground">
          {t("guessCount", { current: guesses.length, total: MAX_GUESSES })}
        </div>
      </div>
    </div>
  );
}
