import { describe, expect, it } from "vitest";
import { PRESETS } from "../constants";
import {
  generateSchedule,
  getPeakFocusInfo,
  scheduleFromTimeRange,
  suggestBetterPreset,
  validateBreakRatio,
} from "../scheduler";

const pomodoro = PRESETS.pomodoro;
const desktime = PRESETS.desktime;
const deepwork = PRESETS.deepwork;

function makeDate(hour: number, minute = 0): Date {
  const d = new Date(2026, 1, 6, hour, minute, 0, 0);
  return d;
}

describe("generateSchedule", () => {
  it("creates correct number of work blocks", () => {
    const schedule = generateSchedule(pomodoro, 4, makeDate(9));
    const workBlocks = schedule.blocks.filter((b) => b.phase === "work");
    expect(workBlocks.length).toBe(4);
  });

  it("creates break blocks between work blocks", () => {
    const schedule = generateSchedule(pomodoro, 4, makeDate(9));
    // 4 work + 3 breaks = 7 blocks
    expect(schedule.blocks.length).toBe(7);
  });

  it("creates a single block for sessionCount=1 (no breaks)", () => {
    const schedule = generateSchedule(pomodoro, 1, makeDate(9));
    expect(schedule.blocks.length).toBe(1);
    expect(schedule.blocks[0]?.phase).toBe("work");
    expect(schedule.totalBreakMinutes).toBe(0);
  });

  it("assigns correct work duration", () => {
    const schedule = generateSchedule(pomodoro, 2, makeDate(9));
    const workBlocks = schedule.blocks.filter((b) => b.phase === "work");
    for (const block of workBlocks) {
      expect(block.durationSeconds).toBe(25 * 60);
    }
  });

  it("creates long break at the correct interval", () => {
    const schedule = generateSchedule(pomodoro, 5, makeDate(9));
    const breakBlocks = schedule.blocks.filter((b) => b.phase !== "work");
    const longBreaks = schedule.blocks.filter((b) => b.phase === "longBreak");
    expect(longBreaks.length).toBe(1);
    expect(breakBlocks.length).toBe(4);
  });

  it("applies fatigue multiplier to breaks in later cycles", () => {
    const schedule = generateSchedule(pomodoro, 8, makeDate(9));
    const breaks = schedule.blocks.filter(
      (b) => b.phase === "break" || b.phase === "longBreak",
    );

    const firstBreak = breaks[0];
    expect(firstBreak?.durationSeconds).toBe(firstBreak?.baseDurationSeconds);

    const fifthWorkIndex = schedule.blocks.findIndex(
      (b) => b.phase === "work" && b.sessionNumber === 5,
    );
    const breakAfterFifth = schedule.blocks[fifthWorkIndex + 1];
    if (breakAfterFifth) {
      expect(breakAfterFifth.durationSeconds).toBeGreaterThan(
        breakAfterFifth.baseDurationSeconds,
      );
    }
  });

  it("caps fatigue multiplier at 1.5x", () => {
    const manyShortCycles = {
      ...pomodoro,
      sessionsBeforeLongBreak: 1,
      maxDailySessions: 20,
    };
    const schedule = generateSchedule(manyShortCycles, 20, makeDate(9));
    const breaks = schedule.blocks.filter((b) => b.phase !== "work");

    for (const b of breaks) {
      const ratio = b.durationSeconds / b.baseDurationSeconds;
      expect(ratio).toBeLessThanOrEqual(1.5 + 0.01);
    }
  });

  it("computes correct totals", () => {
    const schedule = generateSchedule(pomodoro, 2, makeDate(9));
    expect(schedule.totalWorkMinutes).toBe(50);
    expect(schedule.totalBreakMinutes).toBe(5);
  });

  it("computes break-to-work ratio", () => {
    const schedule = generateSchedule(pomodoro, 2, makeDate(9));
    const expectedRatio = (5 * 60) / (50 * 60);
    expect(schedule.breakToWorkRatio).toBeCloseTo(expectedRatio, 4);
  });

  it("assigns sequential start times", () => {
    const schedule = generateSchedule(pomodoro, 3, makeDate(9));
    for (let i = 1; i < schedule.blocks.length; i++) {
      const prev = schedule.blocks[i - 1];
      const curr = schedule.blocks[i];
      if (!prev || !curr) continue;
      const prevEnd =
        new Date(prev.startTime).getTime() + prev.durationSeconds * 1000;
      expect(new Date(curr.startTime).getTime()).toBe(prevEnd);
    }
  });
});

describe("scheduleFromTimeRange", () => {
  it("fits maximum sessions within the time window", () => {
    const start = makeDate(9, 0);
    const end = makeDate(11, 0); // 2 hours
    const schedule = scheduleFromTimeRange(pomodoro, start, end);

    const totalSeconds = schedule.blocks.reduce(
      (sum, b) => sum + b.durationSeconds,
      0,
    );
    expect(totalSeconds).toBeLessThanOrEqual(2 * 60 * 60);
    expect(
      schedule.blocks.filter((b) => b.phase === "work").length,
    ).toBeGreaterThan(0);
  });

  it("returns empty schedule when end time equals start time", () => {
    const time = makeDate(9, 0);
    const schedule = scheduleFromTimeRange(pomodoro, time, time);
    expect(schedule.blocks.length).toBe(0);
    expect(schedule.totalWorkMinutes).toBe(0);
  });

  it("returns empty schedule when end time is before start time", () => {
    const start = makeDate(10, 0);
    const end = makeDate(9, 0);
    const schedule = scheduleFromTimeRange(pomodoro, start, end);
    expect(schedule.blocks.length).toBe(0);
  });

  it("returns at least 1 session when time allows only one work block", () => {
    const start = makeDate(9, 0);
    const end = makeDate(9, 30); // 30 min, enough for one 25-min pomodoro
    const schedule = scheduleFromTimeRange(pomodoro, start, end);
    const workBlocks = schedule.blocks.filter((b) => b.phase === "work");
    expect(workBlocks.length).toBe(1);
  });

  it("fits correct sessions for deep work preset in a 3-hour window", () => {
    const start = makeDate(9, 0);
    const end = makeDate(12, 0); // 3 hours = 180 min
    const schedule = scheduleFromTimeRange(deepwork, start, end);
    const workBlocks = schedule.blocks.filter((b) => b.phase === "work");
    // 1 deep work session = 90 min, 2 sessions = 90 + 20 + 90 = 200 min > 180
    // But with fill: remaining = 90 min, break = 20 min, extra = 70 min >= 10 min
    // So: 1 full session + break + shortened work = 2 work blocks
    expect(workBlocks.length).toBe(2);
  });

  it("respects maxDailySessions cap", () => {
    const start = makeDate(0, 0);
    const end = makeDate(23, 59); // Almost 24 hours
    const schedule = scheduleFromTimeRange(deepwork, start, end);
    const workBlocks = schedule.blocks.filter((b) => b.phase === "work");
    expect(workBlocks.length).toBeLessThanOrEqual(deepwork.maxDailySessions);
  });

  it("returns empty schedule when no session fits", () => {
    const start = makeDate(9, 0);
    const end = makeDate(9, 10); // Only 10 min, not enough for 25-min pomodoro
    const schedule = scheduleFromTimeRange(pomodoro, start, end);
    expect(schedule.blocks.length).toBe(0);
  });
});

describe("scheduleFromTimeRange - fill logic", () => {
  it("fills remaining time with shortened work block", () => {
    // 52 min window with pomodoro (25 min work, 5 min break)
    // 1 session = 25 min. Remaining = 27 min. Break = 5 min, extra = 22 min >= 10 min.
    const start = makeDate(9, 0);
    const end = makeDate(9, 52);
    const schedule = scheduleFromTimeRange(pomodoro, start, end);
    const workBlocks = schedule.blocks.filter((b) => b.phase === "work");

    expect(workBlocks.length).toBe(2);
    expect(workBlocks[0]?.durationSeconds).toBe(25 * 60); // full session
    expect(workBlocks[1]?.durationSeconds).toBe(22 * 60); // shortened fill
  });

  it("does not fill when remaining time is too short", () => {
    // 35 min window with pomodoro: 1 session = 25 min. Remaining = 10 min.
    // Break = 5 min, extra = 5 min < 10 min minimum. No fill.
    const start = makeDate(9, 0);
    const end = makeDate(9, 35);
    const schedule = scheduleFromTimeRange(pomodoro, start, end);
    const workBlocks = schedule.blocks.filter((b) => b.phase === "work");

    expect(workBlocks.length).toBe(1);
  });

  it("adds a break before the fill work block", () => {
    const start = makeDate(9, 0);
    const end = makeDate(9, 52);
    const schedule = scheduleFromTimeRange(pomodoro, start, end);

    // Blocks should be: work, break, work
    expect(schedule.blocks.length).toBe(3);
    expect(schedule.blocks[0]?.phase).toBe("work");
    expect(schedule.blocks[1]?.phase).toBe("break");
    expect(schedule.blocks[2]?.phase).toBe("work");
  });

  it("total duration fits within the time window", () => {
    const start = makeDate(9, 0);
    const end = makeDate(10, 0); // 60 min
    const schedule = scheduleFromTimeRange(pomodoro, start, end);
    const totalSeconds = schedule.blocks.reduce(
      (sum, b) => sum + b.durationSeconds,
      0,
    );
    expect(totalSeconds).toBeLessThanOrEqual(60 * 60);
  });

  it("updates totals after fill", () => {
    const start = makeDate(9, 0);
    const end = makeDate(9, 52);
    const schedule = scheduleFromTimeRange(pomodoro, start, end);

    // 25 + 22 = 47 min work, 5 min break
    expect(schedule.totalWorkMinutes).toBe(47);
    expect(schedule.totalBreakMinutes).toBe(5);
  });

  it("fill block has sequential start time", () => {
    const start = makeDate(9, 0);
    const end = makeDate(9, 52);
    const schedule = scheduleFromTimeRange(pomodoro, start, end);

    for (let i = 1; i < schedule.blocks.length; i++) {
      const prev = schedule.blocks[i - 1];
      const curr = schedule.blocks[i];
      if (!prev || !curr) continue;
      const prevEnd =
        new Date(prev.startTime).getTime() + prev.durationSeconds * 1000;
      expect(new Date(curr.startTime).getTime()).toBe(prevEnd);
    }
  });
});

describe("suggestBetterPreset", () => {
  it("suggests a better preset when significantly more focus is possible", () => {
    // 55 min window with deep work: 90 min doesn't fit → empty schedule
    // Pomodoro: 25 + 5 + 20 = 50 min → 45 min focus
    const start = makeDate(9, 0);
    const end = makeDate(9, 55);
    const result = suggestBetterPreset(deepwork, start, end);

    expect(result).not.toBeNull();
    expect(result?.focusMinutes).toBeGreaterThan(0);
    expect(result?.currentFocusMinutes).toBe(0);
  });

  it("returns null when current preset is already optimal", () => {
    // 30 min window: only pomodoro fits (1 session = 25 min)
    // DeskTime = 52 min doesn't fit, Deep Work = 90 min doesn't fit
    const start = makeDate(9, 0);
    const end = makeDate(9, 30);
    const result = suggestBetterPreset(pomodoro, start, end);

    expect(result).toBeNull();
  });

  it("returns null when improvement is below threshold", () => {
    // Large window where all presets perform similarly
    const start = makeDate(9, 0);
    const end = makeDate(11, 0); // 2 hours
    const result = suggestBetterPreset(pomodoro, start, end);

    // If a suggestion exists, improvement should be >= 15%
    if (result) {
      const improvement =
        (result.focusMinutes - result.currentFocusMinutes) /
        result.currentFocusMinutes;
      expect(improvement).toBeGreaterThanOrEqual(0.15);
    }
  });

  it("never suggests custom preset", () => {
    const start = makeDate(9, 0);
    const end = makeDate(10, 0);
    const result = suggestBetterPreset(pomodoro, start, end);

    if (result) {
      expect(result.presetId).not.toBe("custom");
    }
  });

  it("suggests when current preset produces empty schedule", () => {
    // 45 min window with deep work (90 min) → empty
    // Pomodoro should fit fine
    const start = makeDate(9, 0);
    const end = makeDate(9, 45);
    const result = suggestBetterPreset(deepwork, start, end);

    expect(result).not.toBeNull();
    expect(result?.currentFocusMinutes).toBe(0);
    expect(result?.focusMinutes).toBeGreaterThan(0);
  });

  it("returns null for negative time window", () => {
    const start = makeDate(10, 0);
    const end = makeDate(9, 0);
    const result = suggestBetterPreset(pomodoro, start, end);

    expect(result).toBeNull();
  });
});

describe("validateBreakRatio", () => {
  it("returns valid for ratio in 20-25% range", () => {
    const result = validateBreakRatio({
      blocks: [],
      totalWorkMinutes: 100,
      totalBreakMinutes: 22,
      breakToWorkRatio: 0.22,
    });
    expect(result.valid).toBe(true);
    expect(result.suggestion).toBe("ratioGood");
  });

  it("returns breaksTooShort for ratio below 20%", () => {
    const result = validateBreakRatio({
      blocks: [],
      totalWorkMinutes: 100,
      totalBreakMinutes: 10,
      breakToWorkRatio: 0.1,
    });
    expect(result.valid).toBe(false);
    expect(result.suggestion).toBe("breaksTooShort");
  });

  it("returns breaksTooLong for ratio above 25%", () => {
    const result = validateBreakRatio({
      blocks: [],
      totalWorkMinutes: 100,
      totalBreakMinutes: 40,
      breakToWorkRatio: 0.4,
    });
    expect(result.valid).toBe(false);
    expect(result.suggestion).toBe("breaksTooLong");
  });

  it("returns valid at exact boundary 0.2", () => {
    const result = validateBreakRatio({
      blocks: [],
      totalWorkMinutes: 100,
      totalBreakMinutes: 20,
      breakToWorkRatio: 0.2,
    });
    expect(result.valid).toBe(true);
  });

  it("returns valid at exact boundary 0.25", () => {
    const result = validateBreakRatio({
      blocks: [],
      totalWorkMinutes: 100,
      totalBreakMinutes: 25,
      breakToWorkRatio: 0.25,
    });
    expect(result.valid).toBe(true);
  });
});

describe("getPeakFocusInfo", () => {
  it("returns peak focus for morning hours (8-10)", () => {
    expect(getPeakFocusInfo(8).isPeak).toBe(true);
    expect(getPeakFocusInfo(9).isPeak).toBe(true);
    expect(getPeakFocusInfo(10).isPeak).toBe(true);
    expect(getPeakFocusInfo(8).label).toBe("peakFocus");
  });

  it("returns afternoon dip for hours 14-15", () => {
    expect(getPeakFocusInfo(14).isPeak).toBe(false);
    expect(getPeakFocusInfo(15).isPeak).toBe(false);
    expect(getPeakFocusInfo(14).label).toBe("afternoonDip");
  });

  it("returns no label for other hours", () => {
    expect(getPeakFocusInfo(12).label).toBe("");
    expect(getPeakFocusInfo(20).label).toBe("");
    expect(getPeakFocusInfo(7).label).toBe("");
  });

  it("returns not peak at boundary hour 11", () => {
    expect(getPeakFocusInfo(11).isPeak).toBe(false);
    expect(getPeakFocusInfo(11).label).toBe("");
  });
});

describe("preset-specific schedules", () => {
  it("desktime: all breaks are regular (sessionsBeforeLongBreak=1)", () => {
    const schedule = generateSchedule(desktime, 3, makeDate(9));
    const breaks = schedule.blocks.filter((b) => b.phase !== "work");
    for (const b of breaks) {
      expect(b.phase).toBe("longBreak");
    }
  });

  it("desktime: work blocks are 52 minutes", () => {
    const schedule = generateSchedule(desktime, 2, makeDate(9));
    const workBlocks = schedule.blocks.filter((b) => b.phase === "work");
    for (const b of workBlocks) {
      expect(b.durationSeconds).toBe(52 * 60);
    }
  });

  it("deepwork: work blocks are 90 minutes", () => {
    const schedule = generateSchedule(deepwork, 2, makeDate(9));
    const workBlocks = schedule.blocks.filter((b) => b.phase === "work");
    for (const b of workBlocks) {
      expect(b.durationSeconds).toBe(90 * 60);
    }
  });
});
