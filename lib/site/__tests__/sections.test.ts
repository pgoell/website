import { describe, expect, it } from "vitest";
import { fileNumber } from "../catalog";
import { headings, readingMinutes, slugify } from "../sections";

describe("readingMinutes", () => {
  it("never goes below one minute", () => {
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes("one two three")).toBe(1);
  });
  it("counts about 200 words a minute", () => {
    expect(readingMinutes("word ".repeat(1000))).toBe(5);
  });
});

describe("slugify", () => {
  it("makes URL ids from headings", () => {
    expect(slugify("Why the real sun")).toBe("why-the-real-sun");
    expect(slugify("Größe & Übersicht!")).toBe("grosse-ubersicht");
  });
});

describe("headings", () => {
  it("finds level-two headings and skips code blocks", () => {
    const md = [
      "# Title",
      "## First *part*",
      "text",
      "```",
      "## not a heading",
      "```",
      "### Small",
      "## Second ##",
    ].join("\n");
    expect(headings(md)).toEqual([
      { id: "first-part", text: "First part" },
      { id: "second", text: "Second" },
    ]);
  });
});

describe("fileNumber", () => {
  it("pads like a camera file", () => {
    expect(fileNumber(1)).toBe("100-0001");
    expect(fileNumber(12, 101)).toBe("101-0012");
  });
});
