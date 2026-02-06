import { MAX_STATS_DAYS, PRESETS } from "./constants";
import type {
  Phase,
  PresetConfig,
  PresetId,
  SessionRecord,
  StoredTimerData,
} from "./types";

const TIMER_KEY = "pomodoro:timer";
const STATS_KEY = "pomodoro:stats";

function isSameDay(isoA: string, isoB: string): boolean {
  return isoA.slice(0, 10) === isoB.slice(0, 10);
}

function isValidPresetId(id: unknown): id is PresetId {
  return (
    typeof id === "string" &&
    ["pomodoro", "desktime", "deepwork", "custom"].includes(id)
  );
}

function isValidPhase(p: unknown): p is Phase {
  return typeof p === "string" && ["work", "break", "longBreak"].includes(p);
}

function isValidPresetConfig(c: unknown): c is PresetConfig {
  if (typeof c !== "object" || c === null) return false;
  const obj = c as Record<string, unknown>;
  return (
    isValidPresetId(obj.id) &&
    typeof obj.workMinutes === "number" &&
    typeof obj.breakMinutes === "number" &&
    typeof obj.longBreakMinutes === "number" &&
    typeof obj.sessionsBeforeLongBreak === "number" &&
    typeof obj.maxDailySessions === "number"
  );
}

function isValidStoredTimer(data: unknown): data is StoredTimerData {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;

  if (!isValidPresetId(obj.presetId)) return false;
  if (!isValidPresetConfig(obj.customConfig)) return false;
  if (typeof obj.sessionCount !== "number") return false;
  if (typeof obj.savedAt !== "string") return false;

  const timer = obj.timerState as Record<string, unknown> | undefined;
  if (typeof timer !== "object" || timer === null) return false;
  if (!isValidPhase(timer.phase)) return false;
  if (typeof timer.currentBlockIndex !== "number") return false;
  if (typeof timer.remainingSeconds !== "number") return false;
  if (typeof timer.isRunning !== "boolean") return false;
  if (typeof timer.completedSessions !== "number") return false;

  const schedule = obj.schedule as Record<string, unknown> | undefined;
  if (typeof schedule !== "object" || schedule === null) return false;
  if (!Array.isArray(schedule.blocks)) return false;

  return true;
}

export function loadTimerState(): StoredTimerData | null {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!isValidStoredTimer(data)) return null;

    const today = new Date().toISOString();
    if (!isSameDay(data.savedAt, today)) return null;

    return data;
  } catch {
    return null;
  }
}

export function saveTimerState(data: StoredTimerData): void {
  try {
    localStorage.setItem(TIMER_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

export function clearTimerState(): void {
  try {
    localStorage.removeItem(TIMER_KEY);
  } catch {
    // ignore
  }
}

function isValidSessionRecord(r: unknown): r is SessionRecord {
  if (typeof r !== "object" || r === null) return false;
  const obj = r as Record<string, unknown>;
  return (
    typeof obj.date === "string" &&
    isValidPresetId(obj.presetId) &&
    typeof obj.sessionsCompleted === "number" &&
    typeof obj.totalFocusSeconds === "number" &&
    typeof obj.totalBreakSeconds === "number"
  );
}

export function loadStats(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];

    const valid = data.filter(isValidSessionRecord);

    // Trim to MAX_STATS_DAYS
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_STATS_DAYS);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return valid.filter((r) => r.date >= cutoffStr);
  } catch {
    return [];
  }
}

export function saveStats(records: SessionRecord[]): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(records));
  } catch {
    // localStorage full or unavailable
  }
}

export function upsertTodayStats(
  records: SessionRecord[],
  presetId: PresetId,
  focusSeconds: number,
  breakSeconds: number,
): SessionRecord[] {
  const today = new Date().toISOString().slice(0, 10);
  const existing = records.find((r) => r.date === today);

  if (existing) {
    return records.map((r) =>
      r.date === today
        ? {
            ...r,
            presetId,
            sessionsCompleted: r.sessionsCompleted + 1,
            totalFocusSeconds: r.totalFocusSeconds + focusSeconds,
            totalBreakSeconds: r.totalBreakSeconds + breakSeconds,
          }
        : r,
    );
  }

  return [
    ...records,
    {
      date: today,
      presetId,
      sessionsCompleted: 1,
      totalFocusSeconds: focusSeconds,
      totalBreakSeconds: breakSeconds,
    },
  ];
}

export function getDefaultCustomConfig(): PresetConfig {
  return { ...PRESETS.custom };
}
