import { describe, expect, it } from "vitest";
import { isHiddenPage } from "../hidden-pages";

describe("isHiddenPage", () => {
  it("hides the sections and every page below them", () => {
    for (const p of [
      "/blog",
      "/blog/hello",
      "/games",
      "/games/wordle/solver",
      "/tools/pomodoro",
    ])
      expect(isHiddenPage(p)).toBe(true);
  });
  it("keeps the rest of the site", () => {
    for (const p of ["/", "/impressum", "/datenschutz", "/blogroll"])
      expect(isHiddenPage(p)).toBe(false);
  });
});
