"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface KniffelScoreInputProps {
  onSubmit: (score: number) => void;
  onCancel: () => void;
  locale: string;
  initialValue?: number | null;
}

export function KniffelScoreInput({
  onSubmit,
  onCancel,
  locale,
  initialValue,
}: KniffelScoreInputProps) {
  const [value, setValue] = useState(
    initialValue !== null && initialValue !== undefined
      ? String(initialValue)
      : "",
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const score = Number.parseInt(value, 10);
    if (!Number.isNaN(score) && score >= 0) {
      onSubmit(score);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="rounded-xl border border-border bg-card p-6 shadow-lg w-full max-w-xs">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-center">
            {locale === "de" ? "Punktzahl eingeben" : "Enter Score"}
          </h3>

          <input
            ref={inputRef}
            type="number"
            min="0"
            max="50"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-center text-2xl font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              {locale === "de" ? "Abbrechen" : "Cancel"}
            </Button>
            <Button type="submit" className="flex-1">
              {locale === "de" ? "OK" : "OK"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
