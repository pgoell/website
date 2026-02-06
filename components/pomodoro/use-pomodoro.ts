import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PRESETS } from "@/lib/pomodoro/constants";
import {
  requestPermission,
  sendNotification,
} from "@/lib/pomodoro/notifications";
import {
  generateSchedule,
  getPeakFocusInfo,
  scheduleFromTimeRange,
  suggestBetterPreset,
} from "@/lib/pomodoro/scheduler";
import {
  clearTimerState,
  getDefaultCustomConfig,
  loadStats,
  loadTimerState,
  saveStats,
  saveTimerState,
  upsertTodayStats,
} from "@/lib/pomodoro/storage";
import type {
  PresetConfig,
  PresetId,
  Schedule,
  SessionRecord,
  TimerState,
} from "@/lib/pomodoro/types";

export type SchedulingMode = "sessions" | "focusUntil";

const DEFAULT_SESSION_COUNT = 4;

function getDefaultEndTime(): string {
  const d = new Date();
  d.setHours(d.getHours() + 2, 0, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function getActivePreset(
  presetId: PresetId,
  customConfig: PresetConfig,
): PresetConfig {
  return presetId === "custom" ? customConfig : PRESETS[presetId];
}

export function usePomodoro() {
  const tNotif = useTranslations("pomodoro.notifications");
  const tFocusUntil = useTranslations("pomodoro.focusUntil");

  // Error state
  const [endTimeError, setEndTimeError] = useState<string | null>(null);

  // Config state
  const [presetId, setPresetId] = useState<PresetId>("pomodoro");
  const [customConfig, setCustomConfig] = useState<PresetConfig>(
    getDefaultCustomConfig(),
  );
  const [sessionCount, setSessionCount] = useState(DEFAULT_SESSION_COUNT);
  const [schedulingMode, setSchedulingMode] =
    useState<SchedulingMode>("sessions");
  const [endTimeStr, setEndTimeStr] = useState(getDefaultEndTime);

  // Schedule & timer
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [timerState, setTimerState] = useState<TimerState>({
    phase: "work",
    currentBlockIndex: 0,
    remainingSeconds: 0,
    isRunning: false,
    completedSessions: 0,
  });

  // Stats
  const [stats, setStats] = useState<SessionRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Track last completed work block for stats
  const lastWorkDurationRef = useRef(0);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadTimerState();
    if (stored) {
      setPresetId(stored.presetId);
      setCustomConfig(stored.customConfig);
      setSessionCount(stored.sessionCount);
      setSchedule(stored.schedule);

      // Handle time drift if timer was running
      let restoredTimer = stored.timerState;
      if (restoredTimer.isRunning) {
        const elapsed = Math.floor(
          (Date.now() - new Date(stored.savedAt).getTime()) / 1000,
        );
        restoredTimer = {
          ...restoredTimer,
          remainingSeconds: Math.max(
            0,
            restoredTimer.remainingSeconds - elapsed,
          ),
          isRunning: false, // Pause on restore, let user decide
        };
      }
      setTimerState(restoredTimer);
    }

    setStats(loadStats());
    setLoaded(true);
  }, []);

  // Save timer state on changes
  useEffect(() => {
    if (!loaded || !schedule) return;
    saveTimerState({
      presetId,
      customConfig,
      sessionCount,
      schedule,
      timerState,
      savedAt: new Date().toISOString(),
    });
  }, [loaded, presetId, customConfig, sessionCount, schedule, timerState]);

  // Timer interval
  useEffect(() => {
    if (!timerState.isRunning || !schedule) return;

    const interval = setInterval(() => {
      setTimerState((prev) => {
        if (prev.remainingSeconds <= 1) {
          const currentBlock = schedule.blocks[prev.currentBlockIndex];
          const nextIndex = prev.currentBlockIndex + 1;
          const wasWork = currentBlock?.phase === "work";

          // Track work duration for stats
          if (wasWork && currentBlock) {
            lastWorkDurationRef.current = currentBlock.durationSeconds;
          }

          if (nextIndex >= schedule.blocks.length) {
            // All done
            sendNotification("Pomodoro", tNotif("allDone"));
            return {
              ...prev,
              remainingSeconds: 0,
              isRunning: false,
              completedSessions: wasWork
                ? prev.completedSessions + 1
                : prev.completedSessions,
            };
          }

          const nextBlock = schedule.blocks[nextIndex];
          if (!nextBlock) {
            return { ...prev, remainingSeconds: 0, isRunning: false };
          }

          // Send notification
          if (wasWork) {
            sendNotification("Pomodoro", tNotif("workDone"));
          } else {
            sendNotification("Pomodoro", tNotif("breakDone"));
          }

          return {
            phase: nextBlock.phase,
            currentBlockIndex: nextIndex,
            remainingSeconds: nextBlock.durationSeconds,
            isRunning: true,
            completedSessions: wasWork
              ? prev.completedSessions + 1
              : prev.completedSessions,
          };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.isRunning, schedule, tNotif]);

  // Record stats when a work session completes
  const prevCompletedRef = useRef(0);
  const presetIdRef = useRef(presetId);
  presetIdRef.current = presetId;

  useEffect(() => {
    if (!loaded) return;
    if (timerState.completedSessions > prevCompletedRef.current) {
      const workDuration = lastWorkDurationRef.current;
      setStats((prev) => {
        const updated = upsertTodayStats(
          prev,
          presetIdRef.current,
          workDuration,
          0,
        );
        saveStats(updated);
        return updated;
      });
    }
    prevCompletedRef.current = timerState.completedSessions;
  }, [timerState.completedSessions, loaded]);

  // Handlers
  const handleGenerateSchedule = useCallback(() => {
    const preset = getActivePreset(presetId, customConfig);
    const now = new Date();
    let newSchedule: Schedule;

    if (schedulingMode === "focusUntil") {
      const [hours, minutes] = endTimeStr.split(":").map(Number);
      const endTime = new Date();
      endTime.setHours(hours ?? 0, minutes ?? 0, 0, 0);
      if (endTime <= now) {
        setEndTimeError(tFocusUntil("pastTime"));
        return;
      }
      setEndTimeError(null);
      newSchedule = scheduleFromTimeRange(preset, now, endTime);
      if (newSchedule.blocks.length === 0) {
        setEndTimeError(tFocusUntil("noFit"));
        return;
      }
    } else {
      newSchedule = generateSchedule(preset, sessionCount, now);
    }

    setSchedule(newSchedule);
    const firstBlock = newSchedule.blocks[0];
    setTimerState({
      phase: firstBlock ? firstBlock.phase : "work",
      currentBlockIndex: 0,
      remainingSeconds: firstBlock ? firstBlock.durationSeconds : 0,
      isRunning: false,
      completedSessions: 0,
    });
    requestPermission();
  }, [
    presetId,
    customConfig,
    sessionCount,
    schedulingMode,
    endTimeStr,
    tFocusUntil,
  ]);

  const handleStart = useCallback(() => {
    if (!schedule) {
      handleGenerateSchedule();
      // Will start after schedule is set — use effect below
      return;
    }
    setTimerState((prev) => ({ ...prev, isRunning: true }));
  }, [schedule, handleGenerateSchedule]);

  // Auto-start after generating schedule from handleStart
  const pendingStartRef = useRef(false);
  const handleStartAndGenerate = useCallback(() => {
    if (!schedule) {
      pendingStartRef.current = true;
      handleGenerateSchedule();
    } else {
      setTimerState((prev) => ({ ...prev, isRunning: true }));
    }
  }, [schedule, handleGenerateSchedule]);

  useEffect(() => {
    if (schedule && pendingStartRef.current) {
      pendingStartRef.current = false;
      setTimerState((prev) => ({ ...prev, isRunning: true }));
    }
  }, [schedule]);

  const handlePause = useCallback(() => {
    setTimerState((prev) => ({ ...prev, isRunning: false }));
  }, []);

  const handleReset = useCallback(() => {
    setSchedule(null);
    setTimerState({
      phase: "work",
      currentBlockIndex: 0,
      remainingSeconds: 0,
      isRunning: false,
      completedSessions: 0,
    });
    clearTimerState();
  }, []);

  const handleSkip = useCallback(() => {
    if (!schedule) return;
    const nextIndex = timerState.currentBlockIndex + 1;
    if (nextIndex >= schedule.blocks.length) {
      handleReset();
      return;
    }
    const nextBlock = schedule.blocks[nextIndex];
    if (!nextBlock) {
      handleReset();
      return;
    }
    setTimerState((prev) => ({
      ...prev,
      phase: nextBlock.phase,
      currentBlockIndex: nextIndex,
      remainingSeconds: nextBlock.durationSeconds,
      completedSessions:
        prev.phase === "work"
          ? prev.completedSessions + 1
          : prev.completedSessions,
    }));
  }, [schedule, timerState.currentBlockIndex, handleReset]);

  const handlePresetChange = useCallback(
    (id: PresetId) => {
      setPresetId(id);
      setEndTimeError(null);
      const preset = id === "custom" ? customConfig : PRESETS[id];
      setSessionCount(Math.min(DEFAULT_SESSION_COUNT, preset.maxDailySessions));
      // Reset schedule when preset changes
      if (schedule && !timerState.isRunning) {
        setSchedule(null);
        setTimerState({
          phase: "work",
          currentBlockIndex: 0,
          remainingSeconds: 0,
          isRunning: false,
          completedSessions: 0,
        });
      }
    },
    [schedule, timerState.isRunning, customConfig],
  );

  const handleSessionCountChange = useCallback(
    (count: number) => {
      const preset = getActivePreset(presetId, customConfig);
      setSessionCount(Math.max(1, Math.min(preset.maxDailySessions, count)));
    },
    [presetId, customConfig],
  );

  const handleSchedulingModeChange = useCallback((mode: SchedulingMode) => {
    setSchedulingMode(mode);
    if (mode === "sessions") {
      setEndTimeError(null);
    }
  }, []);

  const handleEndTimeChange = useCallback((value: string) => {
    setEndTimeStr(value);
    setEndTimeError(null);
  }, []);

  // Derived values
  const isTimerActive = schedule !== null;
  const isDone =
    isTimerActive &&
    !timerState.isRunning &&
    timerState.remainingSeconds === 0 &&
    timerState.currentBlockIndex > 0;
  const totalSessions = schedule
    ? schedule.blocks.filter((b) => b.phase === "work").length
    : sessionCount;

  // Preset suggestion for focusUntil mode
  const presetSuggestion = useMemo(() => {
    if (schedulingMode !== "focusUntil" || isTimerActive) return null;
    const [hours, minutes] = endTimeStr.split(":").map(Number);
    const now = new Date();
    const endTime = new Date();
    endTime.setHours(hours ?? 0, minutes ?? 0, 0, 0);
    if (endTime <= now) return null;
    const preset = getActivePreset(presetId, customConfig);
    return suggestBetterPreset(preset, now, endTime);
  }, [schedulingMode, endTimeStr, presetId, customConfig, isTimerActive]);

  // Time-of-day hint
  const peakInfo = getPeakFocusInfo(new Date().getHours());

  const currentBlock = schedule?.blocks[timerState.currentBlockIndex];
  const totalSecondsForBlock = currentBlock?.durationSeconds ?? 0;

  const activePreset = getActivePreset(presetId, customConfig);

  return {
    // Config state
    presetId,
    customConfig,
    setCustomConfig,
    sessionCount,
    schedulingMode,
    endTimeStr,
    endTimeError,

    // Schedule & timer
    schedule,
    timerState,

    // Stats
    stats,
    loaded,

    // Derived values
    isTimerActive,
    isDone,
    totalSessions,
    presetSuggestion,
    peakInfo,
    totalSecondsForBlock,
    activePreset,

    // Handlers
    handleGenerateSchedule,
    handleStart,
    handleStartAndGenerate,
    handlePause,
    handleReset,
    handleSkip,
    handlePresetChange,
    handleSessionCountChange,
    handleSchedulingModeChange,
    handleEndTimeChange,
  };
}
