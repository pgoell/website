"use client";

import { useTranslations } from "next-intl";
import type { PresetConfig } from "@/lib/pomodoro/types";

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
        className="w-20 rounded-lg border border-border bg-card px-2 py-1 text-right text-sm disabled:opacity-50"
      />
    </label>
  );
}

export function CustomPresetForm({
  config,
  onChange,
  disabled,
}: {
  config: PresetConfig;
  onChange: (c: PresetConfig) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("pomodoro.custom");

  const update = (key: keyof PresetConfig, value: number) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card/60 p-4">
      <NumberInput
        label={t("workMinutes")}
        value={config.workMinutes}
        onChange={(v) => update("workMinutes", v)}
        min={1}
        max={120}
        disabled={disabled}
      />
      <NumberInput
        label={t("breakMinutes")}
        value={config.breakMinutes}
        onChange={(v) => update("breakMinutes", v)}
        min={1}
        max={60}
        disabled={disabled}
      />
      <NumberInput
        label={t("longBreakMinutes")}
        value={config.longBreakMinutes}
        onChange={(v) => update("longBreakMinutes", v)}
        min={1}
        max={60}
        disabled={disabled}
      />
      <NumberInput
        label={t("sessionsBeforeLongBreak")}
        value={config.sessionsBeforeLongBreak}
        onChange={(v) => update("sessionsBeforeLongBreak", v)}
        min={1}
        max={12}
        disabled={disabled}
      />
    </div>
  );
}
