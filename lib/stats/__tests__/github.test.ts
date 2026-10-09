import { describe, expect, it } from "vitest";
import { contributionWeeks, languageShares } from "../github";

const repo = (language: string | null, size: number, fork = false) => ({
  language,
  size,
  fork,
});

describe("languageShares", () => {
  it("adds sizes across repos and sorts by share", () => {
    expect(
      languageShares([
        repo("Python", 300),
        repo("CSS", 100),
        repo("TypeScript", 400),
        repo("TypeScript", 200),
      ]),
    ).toEqual([
      { name: "TypeScript", share: 0.6 },
      { name: "Python", share: 0.3 },
      { name: "CSS", share: 0.1 },
    ]);
  });

  it("skips forks and repos without code", () => {
    expect(languageShares([repo(null, 50), repo("Go", 50, true)])).toEqual([]);
  });
});

describe("contributionWeeks", () => {
  const cell = (date: string, id: string) =>
    `<td tabindex="0" data-date="${date}" id="${id}" data-level="2" class="ContributionCalendar-day"></td>`;
  const tip = (id: string, text: string) =>
    `<tool-tip id="tooltip-${id}" for="${id}" class="sr-only">${text}</tool-tip>`;

  it("pairs cells with their tooltips and sums a week", () => {
    const html = [
      cell("2026-10-09", "c-5-52"),
      tip("c-5-52", "171 contributions on October 9th."),
      cell("2026-10-03", "c-6-51"),
      tip("c-6-51", "No contributions on October 3rd."),
      cell("2026-10-08", "c-4-52"),
      tip("c-4-52", "1 contribution on October 8th."),
    ].join("\n");
    expect(contributionWeeks(html)).toEqual([172]);
  });

  it("keeps the last 52 weeks, the last one ending on the last day", () => {
    const html = Array.from({ length: 370 }, (_, i) => {
      const date = new Date(Date.UTC(2026, 0, 1 + i))
        .toISOString()
        .slice(0, 10);
      return (
        cell(date, `c-${i}`) + tip(`c-${i}`, `${i} contributions on a day.`)
      );
    }).join("");
    const weeks = contributionWeeks(html);
    expect(weeks).toHaveLength(52);
    expect(weeks[0]).toBe(6 + 7 + 8 + 9 + 10 + 11 + 12);
    expect(weeks[51]).toBe(363 + 364 + 365 + 366 + 367 + 368 + 369);
  });

  it("returns nothing for a page without a calendar", () => {
    expect(contributionWeeks("<html></html>")).toEqual([]);
  });
});
