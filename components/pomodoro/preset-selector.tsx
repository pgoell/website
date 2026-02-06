"use client";

import { useTranslations } from "next-intl";
import type { PresetId } from "@/lib/pomodoro/types";

const PRESET_IDS: PresetId[] = ["pomodoro", "desktime", "deepwork", "custom"];

export function PresetSelector({
  selected,
  onSelect,
  disabled,
}: {
  selected: PresetId;
  onSelect: (id: PresetId) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("pomodoro.presets");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {PRESET_IDS.map((id) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(id)}
            className={`rounded-xl border p-3 text-left transition-colors ${
              selected === id
                ? "border-primary bg-primary/10"
                : "border-border bg-card/60 hover:bg-accent/50"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div className="text-sm font-medium">{t(id)}</div>
            <div className="text-xs text-muted-foreground">
              {t(`${id}Desc`)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
