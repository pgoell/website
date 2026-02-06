"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { CustomPresetForm } from "./custom-preset-form";
import { PresetSelector } from "./preset-selector";
import { ScheduleView } from "./schedule-view";
import { SessionTrack } from "./session-track";
import { SourcesSection } from "./sources-section";
import { StatsPanel } from "./stats-panel";
import { TimerDisplay } from "./timer-display";

type SchedulingMode = "sessions" | "focusUntil";

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

export function PomodoroApp() {
  const tNotif = useTranslations("pomodoro.notifications");
  const tTimer = useTranslations("pomodoro.timer");
  const tSessions = useTranslations("pomodoro.sessions");
  const tTimeOfDay = useTranslations("pomodoro.timeOfDay");
  const tFocusUntil = useTranslations("pomodoro.focusUntil");
  const tPresets = useTranslations("pomodoro.presets");

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
  const phaseLabel =
    timerState.phase === "work"
      ? tTimer("work")
      : timerState.phase === "longBreak"
        ? tTimer("longBreak")
        : tTimer("break");

  const currentBlock = schedule?.blocks[timerState.currentBlockIndex];
  const totalSecondsForBlock = currentBlock?.durationSeconds ?? 0;

  return (
    <div className="space-y-6">
      {/* Preset selection */}
      <PresetSelector
        selected={presetId}
        onSelect={handlePresetChange}
        disabled={timerState.isRunning}
      />

      {/* Custom form */}
      {presetId === "custom" && (
        <CustomPresetForm
          config={customConfig}
          onChange={setCustomConfig}
          disabled={timerState.isRunning}
        />
      )}

      {/* Scheduling mode toggle */}
      {!isTimerActive && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSchedulingMode("sessions");
                setEndTimeError(null);
              }}
              className={`flex-1 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                schedulingMode === "sessions"
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border hover:bg-accent/50"
              }`}
            >
              {tSessions("label")}
            </button>
            <button
              type="button"
              onClick={() => setSchedulingMode("focusUntil")}
              className={`flex-1 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                schedulingMode === "focusUntil"
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border hover:bg-accent/50"
              }`}
            >
              {tFocusUntil("label")}
            </button>
          </div>

          {schedulingMode === "sessions" ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {tSessions("label")}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleSessionCountChange(sessionCount - 1)}
                  disabled={sessionCount <= 1}
                >
                  -
                </Button>
                <span className="w-8 text-center tabular-nums font-medium">
                  {sessionCount}
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleSessionCountChange(sessionCount + 1)}
                  disabled={
                    sessionCount >=
                    getActivePreset(presetId, customConfig).maxDailySessions
                  }
                >
                  +
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {tFocusUntil("endTime")}
                </span>
                <input
                  type="time"
                  value={endTimeStr}
                  onChange={(e) => {
                    setEndTimeStr(e.target.value);
                    setEndTimeError(null);
                  }}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
                />
              </div>
              {endTimeError && (
                <p className="text-xs text-destructive">{endTimeError}</p>
              )}
              {!endTimeError && presetSuggestion && (
                <div className="flex items-center justify-between rounded-lg bg-accent/50 px-3 py-2">
                  <span className="text-xs text-muted-foreground">
                    {tFocusUntil("suggestion", {
                      preset: tPresets(presetSuggestion.presetId),
                      minutes: presetSuggestion.focusMinutes,
                    })}
                  </span>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() =>
                      handlePresetChange(presetSuggestion.presetId)
                    }
                  >
                    {tFocusUntil("switch")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Time-of-day hint */}
      {peakInfo.label && !isTimerActive && (
        <div className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
          {tTimeOfDay(peakInfo.label)}
        </div>
      )}

      {/* Timer display */}
      {isTimerActive && (
        <div className="flex flex-col items-center gap-4">
          <TimerDisplay
            remainingSeconds={timerState.remainingSeconds}
            totalSeconds={totalSecondsForBlock}
            phase={timerState.phase}
            label={isDone ? tTimer("done") : phaseLabel}
          />

          <SessionTrack
            completedSessions={timerState.completedSessions}
            totalSessions={totalSessions}
            currentIsWork={timerState.phase === "work" && !isDone}
          />

          <div className="text-xs text-muted-foreground">
            {tSessions("completed", {
              current: timerState.completedSessions,
              total: totalSessions,
            })}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center gap-2">
        {!isTimerActive && (
          <Button onClick={handleStartAndGenerate}>{tTimer("start")}</Button>
        )}
        {isTimerActive && !isDone && (
          <>
            {timerState.isRunning ? (
              <Button variant="outline" onClick={handlePause}>
                {tTimer("pause")}
              </Button>
            ) : (
              <Button onClick={handleStart}>{tTimer("resume")}</Button>
            )}
            <Button variant="outline" onClick={handleSkip}>
              {tTimer("skip")}
            </Button>
          </>
        )}
        {isTimerActive && (
          <Button variant="ghost" onClick={handleReset}>
            {tTimer("reset")}
          </Button>
        )}
      </div>

      {/* Schedule */}
      {schedule && (
        <ScheduleView
          schedule={schedule}
          currentBlockIndex={timerState.currentBlockIndex}
        />
      )}

      {/* Stats */}
      {loaded && <StatsPanel records={stats} />}

      {/* Sources */}
      <SourcesSection />
    </div>
  );
}
