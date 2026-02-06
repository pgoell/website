export type PresetId = "pomodoro" | "desktime" | "deepwork" | "custom";

export type PresetConfig = {
  id: PresetId;
  workMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  maxDailySessions: number;
};

export type Phase = "work" | "break" | "longBreak";

export type ScheduleBlock = {
  phase: Phase;
  durationSeconds: number;
  baseDurationSeconds: number;
  startTime: string; // ISO string for serialization
  sessionNumber: number; // 1-indexed for work, 0 for breaks
};

export type Schedule = {
  blocks: ScheduleBlock[];
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  breakToWorkRatio: number;
};

export type TimerState = {
  phase: Phase;
  currentBlockIndex: number;
  remainingSeconds: number;
  isRunning: boolean;
  completedSessions: number;
};

export type SessionRecord = {
  date: string; // YYYY-MM-DD
  presetId: PresetId;
  sessionsCompleted: number;
  totalFocusSeconds: number;
  totalBreakSeconds: number;
};

export type StoredTimerData = {
  presetId: PresetId;
  customConfig: PresetConfig;
  sessionCount: number;
  schedule: Schedule;
  timerState: TimerState;
  savedAt: string; // ISO string
};
