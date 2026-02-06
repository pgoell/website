"use client";

import { cn } from "@/lib/utils";

export function SessionTrack({
  completedSessions,
  totalSessions,
  currentIsWork,
}: {
  completedSessions: number;
  totalSessions: number;
  currentIsWork: boolean;
}) {
  const dots = [];
  for (let i = 0; i < totalSessions; i++) {
    const isCompleted = i < completedSessions;
    const isCurrent = i === completedSessions && currentIsWork;
    dots.push(
      <div
        key={`s${i}`}
        className={cn(
          "h-3 w-3 rounded-full transition-colors",
          isCompleted && "bg-primary",
          isCurrent &&
            "bg-primary/50 ring-2 ring-primary ring-offset-2 ring-offset-background",
          !isCompleted && !isCurrent && "bg-muted",
        )}
      />,
    );
  }

  return <div className="flex items-center justify-center gap-2">{dots}</div>;
}
