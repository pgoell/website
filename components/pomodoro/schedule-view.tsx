"use client";

import { useTranslations } from "next-intl";
import { validateBreakRatio } from "@/lib/pomodoro/scheduler";
import type { Schedule } from "@/lib/pomodoro/types";
import { cn } from "@/lib/utils";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ScheduleView({
  schedule,
  currentBlockIndex,
}: {
  schedule: Schedule;
  currentBlockIndex: number;
}) {
  const t = useTranslations("pomodoro.schedule");
  const { valid, suggestion } = validateBreakRatio(schedule);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{t("title")}</h3>

      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {schedule.blocks.map((block, i) => {
          const isCurrent = i === currentBlockIndex;
          const isPast = i < currentBlockIndex;
          const minutes = Math.round(block.durationSeconds / 60);
          const label =
            block.phase === "work"
              ? t("session", { number: block.sessionNumber })
              : block.phase === "longBreak"
                ? t("longBreakLabel")
                : t("breakLabel");

          return (
            <div
              key={`${block.startTime}-${block.phase}`}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-1.5 text-sm",
                isCurrent && "bg-primary/10 font-medium",
                isPast && "text-muted-foreground line-through opacity-60",
                !isCurrent && !isPast && "text-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    block.phase === "work" && "bg-primary",
                    block.phase === "break" && "bg-chart-2",
                    block.phase === "longBreak" && "bg-chart-4",
                  )}
                />
                {label}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {t("duration", { minutes })} · {formatTime(block.startTime)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
        <div>{t("totalWork", { minutes: schedule.totalWorkMinutes })}</div>
        <div>{t("totalBreak", { minutes: schedule.totalBreakMinutes })}</div>
        <div>
          {t("ratio", {
            percent: Math.round(schedule.breakToWorkRatio * 100),
          })}{" "}
          <span className={valid ? "text-chart-2" : "text-chart-5"}>
            {t(suggestion)}
          </span>
        </div>
      </div>
    </div>
  );
}
