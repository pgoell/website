"use client";

import { useTranslations } from "next-intl";

const SOURCES = [
  {
    key: "pomodoroTechnique",
    descKey: "pomodoroDesc",
    url: "https://francescocirillo.com/products/the-pomodoro-technique",
  },
  {
    key: "desktime",
    descKey: "desktimeDesc",
    url: "https://desktime.com/blog/52-17-updated",
  },
  {
    key: "ultradian",
    descKey: "ultradianDesc",
    url: "https://en.wikipedia.org/wiki/Basic_rest%E2%80%93activity_cycle",
  },
  {
    key: "huberman",
    descKey: "hubermanDesc",
    url: "https://www.hubermanlab.com/episode/focus-toolkit-tools-to-improve-your-focus-and-concentration",
  },
  {
    key: "microbreaks",
    descKey: "microbreaksDesc",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9432722/",
  },
  {
    key: "breakRatio",
    descKey: "breakRatioDesc",
    url: "https://chrisbailey.com/for-optimal-productivity-be-on-break-for-20-25-of-the-workday/",
  },
] as const;

export function SourcesSection() {
  const t = useTranslations("pomodoro.sources");

  return (
    <details className="rounded-xl border border-border bg-card/60 p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        <span className="ml-1">{t("title")}</span>
      </summary>
      <ul className="mt-3 space-y-3">
        {SOURCES.map(({ key, descKey, url }) => (
          <li key={key}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              {t(key)}
            </a>
            <p className="text-xs text-muted-foreground">{t(descKey)}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
