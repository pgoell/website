import {
  FATIGUE_INCREASE_PER_CYCLE,
  MAX_FATIGUE_MULTIPLIER,
  MIN_EXTRA_WORK_SECONDS,
  PRESETS,
  SUGGESTION_MIN_IMPROVEMENT,
  TARGET_BREAK_RATIO_MAX,
  TARGET_BREAK_RATIO_MIN,
} from "./constants";
import type { PresetConfig, PresetId, Schedule, ScheduleBlock } from "./types";

function computeTotals(blocks: ScheduleBlock[]): {
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  breakToWorkRatio: number;
} {
  const totalWorkSeconds = blocks
    .filter((b) => b.phase === "work")
    .reduce((sum, b) => sum + b.durationSeconds, 0);
  const totalBreakSeconds = blocks
    .filter((b) => b.phase !== "work")
    .reduce((sum, b) => sum + b.durationSeconds, 0);
  return {
    totalWorkMinutes: Math.round(totalWorkSeconds / 60),
    totalBreakMinutes: Math.round(totalBreakSeconds / 60),
    breakToWorkRatio:
      totalWorkSeconds > 0 ? totalBreakSeconds / totalWorkSeconds : 0,
  };
}

const EMPTY_SCHEDULE: Schedule = {
  blocks: [],
  totalWorkMinutes: 0,
  totalBreakMinutes: 0,
  breakToWorkRatio: 0,
};

export function generateSchedule(
  preset: PresetConfig,
  sessionCount: number,
  startTime: Date,
): Schedule {
  const blocks: ScheduleBlock[] = [];
  let cursor = startTime.getTime();

  for (let i = 1; i <= sessionCount; i++) {
    const workDuration = preset.workMinutes * 60;
    blocks.push({
      phase: "work",
      durationSeconds: workDuration,
      baseDurationSeconds: workDuration,
      startTime: new Date(cursor).toISOString(),
      sessionNumber: i,
    });
    cursor += workDuration * 1000;

    if (i < sessionCount) {
      const isLongBreak = i % preset.sessionsBeforeLongBreak === 0;
      const baseBreakMinutes = isLongBreak
        ? preset.longBreakMinutes
        : preset.breakMinutes;
      const baseBreakSeconds = baseBreakMinutes * 60;

      const cyclesSoFar = Math.floor((i - 1) / preset.sessionsBeforeLongBreak);
      const fatigueMultiplier = Math.min(
        1 + cyclesSoFar * FATIGUE_INCREASE_PER_CYCLE,
        MAX_FATIGUE_MULTIPLIER,
      );
      const adjustedBreak = Math.round(baseBreakSeconds * fatigueMultiplier);

      blocks.push({
        phase: isLongBreak ? "longBreak" : "break",
        durationSeconds: adjustedBreak,
        baseDurationSeconds: baseBreakSeconds,
        startTime: new Date(cursor).toISOString(),
        sessionNumber: 0,
      });
      cursor += adjustedBreak * 1000;
    }
  }

  return { blocks, ...computeTotals(blocks) };
}

export function scheduleFromTimeRange(
  preset: PresetConfig,
  startTime: Date,
  endTime: Date,
): Schedule {
  const availableSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
  if (availableSeconds <= 0) {
    return EMPTY_SCHEDULE;
  }

  // Find max complete sessions that fit
  let base: Schedule | null = null;
  for (
    let sessionCount = preset.maxDailySessions;
    sessionCount >= 1;
    sessionCount--
  ) {
    const candidate = generateSchedule(preset, sessionCount, startTime);
    const totalDuration = candidate.blocks.reduce(
      (sum, b) => sum + b.durationSeconds,
      0,
    );
    if (totalDuration <= availableSeconds) {
      base = candidate;
      break;
    }
  }

  if (!base) {
    return EMPTY_SCHEDULE;
  }

  // Fill remaining time with a shortened work block
  const usedSeconds = base.blocks.reduce(
    (sum, b) => sum + b.durationSeconds,
    0,
  );
  const remaining = availableSeconds - usedSeconds;
  const lastBlock = base.blocks[base.blocks.length - 1];
  const workCount = base.blocks.filter((b) => b.phase === "work").length;

  if (lastBlock && remaining > 0 && workCount < preset.maxDailySessions) {
    const breakDuration = preset.breakMinutes * 60;
    const extraWorkSeconds = Math.floor(remaining - breakDuration);

    if (extraWorkSeconds >= MIN_EXTRA_WORK_SECONDS) {
      const cursor =
        new Date(lastBlock.startTime).getTime() +
        lastBlock.durationSeconds * 1000;

      base.blocks.push({
        phase: "break",
        durationSeconds: breakDuration,
        baseDurationSeconds: breakDuration,
        startTime: new Date(cursor).toISOString(),
        sessionNumber: 0,
      });

      base.blocks.push({
        phase: "work",
        durationSeconds: extraWorkSeconds,
        baseDurationSeconds: preset.workMinutes * 60,
        startTime: new Date(cursor + breakDuration * 1000).toISOString(),
        sessionNumber: workCount + 1,
      });

      const totals = computeTotals(base.blocks);
      base.totalWorkMinutes = totals.totalWorkMinutes;
      base.totalBreakMinutes = totals.totalBreakMinutes;
      base.breakToWorkRatio = totals.breakToWorkRatio;
    }
  }

  return base;
}

export function suggestBetterPreset(
  currentPreset: PresetConfig,
  startTime: Date,
  endTime: Date,
): {
  presetId: PresetId;
  focusMinutes: number;
  currentFocusMinutes: number;
} | null {
  const currentSchedule = scheduleFromTimeRange(
    currentPreset,
    startTime,
    endTime,
  );
  const currentFocus = currentSchedule.totalWorkMinutes;

  let best: { presetId: PresetId; focusMinutes: number } | null = null;

  for (const [id, preset] of Object.entries(PRESETS)) {
    if (id === "custom" || id === currentPreset.id) continue;
    const schedule = scheduleFromTimeRange(preset, startTime, endTime);
    // Only consider if the schedule actually fits (has blocks)
    if (
      schedule.blocks.length > 0 &&
      schedule.totalWorkMinutes > (best?.focusMinutes ?? currentFocus)
    ) {
      best = {
        presetId: id as PresetId,
        focusMinutes: schedule.totalWorkMinutes,
      };
    }
  }

  if (!best) return null;

  // When current preset doesn't fit at all, always suggest
  if (currentFocus === 0) {
    return { ...best, currentFocusMinutes: 0 };
  }

  // Only suggest if improvement is significant
  const improvement = (best.focusMinutes - currentFocus) / currentFocus;
  if (improvement < SUGGESTION_MIN_IMPROVEMENT) return null;

  return { ...best, currentFocusMinutes: currentFocus };
}

export function validateBreakRatio(schedule: Schedule): {
  valid: boolean;
  suggestion: string;
} {
  const { breakToWorkRatio } = schedule;
  if (
    breakToWorkRatio >= TARGET_BREAK_RATIO_MIN &&
    breakToWorkRatio <= TARGET_BREAK_RATIO_MAX
  ) {
    return { valid: true, suggestion: "ratioGood" };
  }
  if (breakToWorkRatio < TARGET_BREAK_RATIO_MIN) {
    return { valid: false, suggestion: "breaksTooShort" };
  }
  return { valid: false, suggestion: "breaksTooLong" };
}

export function getPeakFocusInfo(currentHour: number): {
  isPeak: boolean;
  label: string;
} {
  if (currentHour >= 8 && currentHour < 11) {
    return { isPeak: true, label: "peakFocus" };
  }
  if (currentHour >= 14 && currentHour < 16) {
    return { isPeak: false, label: "afternoonDip" };
  }
  return { isPeak: false, label: "" };
}
