"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CustomPresetForm } from "./custom-preset-form";
import { PresetSelector } from "./preset-selector";
import { ScheduleView } from "./schedule-view";
import { SessionTrack } from "./session-track";
import { SourcesSection } from "./sources-section";
import { StatsPanel } from "./stats-panel";
import { TimerDisplay } from "./timer-display";
import { usePomodoro } from "./use-pomodoro";

export function PomodoroApp() {
  const tTimer = useTranslations("pomodoro.timer");
  const tSessions = useTranslations("pomodoro.sessions");
  const tTimeOfDay = useTranslations("pomodoro.timeOfDay");
  const tFocusUntil = useTranslations("pomodoro.focusUntil");
  const tPresets = useTranslations("pomodoro.presets");

  const {
    presetId,
    customConfig,
    setCustomConfig,
    sessionCount,
    schedulingMode,
    endTimeStr,
    endTimeError,
    schedule,
    timerState,
    stats,
    loaded,
    isTimerActive,
    isDone,
    totalSessions,
    presetSuggestion,
    peakInfo,
    totalSecondsForBlock,
    activePreset,
    handleStart,
    handleStartAndGenerate,
    handlePause,
    handleReset,
    handleSkip,
    handlePresetChange,
    handleSessionCountChange,
    handleSchedulingModeChange,
    handleEndTimeChange,
  } = usePomodoro();

  const phaseLabel =
    timerState.phase === "work"
      ? tTimer("work")
      : timerState.phase === "longBreak"
        ? tTimer("longBreak")
        : tTimer("break");

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
              onClick={() => handleSchedulingModeChange("sessions")}
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
              onClick={() => handleSchedulingModeChange("focusUntil")}
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
                  disabled={sessionCount >= activePreset.maxDailySessions}
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
                  onChange={(e) => handleEndTimeChange(e.target.value)}
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
