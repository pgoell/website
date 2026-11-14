import { describe, expect, it } from "vitest";
import { isHiddenPage } from "../hidden-pages";

describe("isHiddenPage", () => {
  it("hides the sections and every page below them", () => {
    for (const p of ["/games", "/games/wordle/solver", "/tools/pomodoro"])
      expect(isHiddenPage(p)).toBe(true);
  });
  it("keeps the rest of the site", () => {
    for (const p of [
      "/",
      "/impressum",
      "/datenschutz",
      "/blog",
      "/blog/hello",
      "/gamesroom",
    ])
      expect(isHiddenPage(p)).toBe(false);
  });
});
