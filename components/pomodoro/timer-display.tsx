"use client";

import type { Phase } from "@/lib/pomodoro/types";
import { cn } from "@/lib/utils";

const RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function phaseStroke(phase: Phase): string {
  switch (phase) {
    case "work":
      return "stroke-primary";
    case "break":
      return "stroke-chart-2";
    case "longBreak":
      return "stroke-chart-4";
  }
}

export function TimerDisplay({
  remainingSeconds,
  totalSeconds,
  phase,
  label,
}: {
  remainingSeconds: number;
  totalSeconds: number;
  phase: Phase;
  label: string;
}) {
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const offset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        viewBox="0 0 200 200"
        className="h-48 w-48 sm:h-56 sm:w-56"
        aria-hidden="true"
      >
        <circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          className="stroke-muted"
          strokeWidth="8"
        />
        <circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          className={cn(
            phaseStroke(phase),
            "transition-[stroke-dashoffset] duration-1000 ease-linear",
          )}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 100 100)"
        />
        <text
          x="100"
          y="100"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground text-4xl font-mono font-bold"
          style={{ fontSize: "36px" }}
        >
          {formatTime(remainingSeconds)}
        </text>
      </svg>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
