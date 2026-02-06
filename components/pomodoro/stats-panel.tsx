"use client";

import { useTranslations } from "next-intl";
import type { SessionRecord } from "@/lib/pomodoro/types";

function computeStreak(records: SessionRecord[]): number {
  if (records.length === 0) return 0;

  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const today = new Date().toISOString().slice(0, 10);

  // Start from today or yesterday
  let streak = 0;
  const checkDate = new Date();

  // If today has no record, start from yesterday
  if (sorted[0]?.date !== today) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (sorted.some((r) => r.date === dateStr && r.sessionsCompleted > 0)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function StatsPanel({ records }: { records: SessionRecord[] }) {
  const t = useTranslations("pomodoro.stats");

  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noData")}</p>;
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayRecord = records.find((r) => r.date === today);
  const streak = computeStreak(records);
  const totalSessions = records.reduce(
    (sum, r) => sum + r.sessionsCompleted,
    0,
  );
  const totalHours = Math.round(
    records.reduce((sum, r) => sum + r.totalFocusSeconds, 0) / 3600,
  );

  return (
    <details className="rounded-xl border border-border bg-card/60 p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        <span className="ml-1">{t("title")}</span>
      </summary>
      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        <div>
          {t("today")}:{" "}
          {todayRecord
            ? `${t("sessionsToday", { count: todayRecord.sessionsCompleted })} · ${t("focusToday", { minutes: Math.round(todayRecord.totalFocusSeconds / 60) })}`
            : t("noData")}
        </div>
        {streak > 0 && <div>{t("streak", { days: streak })}</div>}
        <div>
          {t("allTime", { sessions: totalSessions, hours: totalHours })}
        </div>
      </div>
    </details>
  );
}
