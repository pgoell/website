import type { PresetConfig, PresetId } from "./types";

export const PRESETS: Record<PresetId, PresetConfig> = {
  pomodoro: {
    id: "pomodoro",
    workMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 20,
    sessionsBeforeLongBreak: 4,
    maxDailySessions: 8,
  },
  desktime: {
    id: "desktime",
    workMinutes: 52,
    breakMinutes: 17,
    longBreakMinutes: 17,
    sessionsBeforeLongBreak: 1,
    maxDailySessions: 5,
  },
  deepwork: {
    id: "deepwork",
    workMinutes: 90,
    breakMinutes: 20,
    longBreakMinutes: 30,
    sessionsBeforeLongBreak: 1,
    maxDailySessions: 3,
  },
  custom: {
    id: "custom",
    workMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    sessionsBeforeLongBreak: 4,
    maxDailySessions: 8,
  },
};

export const FATIGUE_INCREASE_PER_CYCLE = 0.12;
export const MAX_FATIGUE_MULTIPLIER = 1.5;
export const TARGET_BREAK_RATIO_MIN = 0.2;
export const TARGET_BREAK_RATIO_MAX = 0.25;
export const MIN_EXTRA_WORK_SECONDS = 10 * 60;
export const SUGGESTION_MIN_IMPROVEMENT = 0.15;
export const MAX_STATS_DAYS = 90;
