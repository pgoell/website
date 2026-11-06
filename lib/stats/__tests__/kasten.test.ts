import { describe, expect, it } from "vitest";
import { toBook } from "../kasten";

const now = new Date("2026-11-06T12:00:00Z");
const base = {
  title: "The Staff Engineer's Path",
  author: "Tanya Reilly",
  progress: 0.41,
  read_at: "2026-11-05T21:30:00Z",
};

describe("toBook", () => {
  it("keeps title, author and progress", () => {
    expect(toBook(base, now)).toEqual({
      title: "The Staff Engineer's Path",
      author: "Tanya Reilly",
      progress: 0.41,
    });
  });

  it("drops a book not read for over sixty days", () => {
    expect(
      toBook({ ...base, read_at: "2026-08-01T00:00:00Z" }, now),
    ).toBeNull();
  });

  it("needs a title and a read time", () => {
    expect(toBook({ ...base, title: " " }, now)).toBeNull();
    expect(toBook({ ...base, read_at: undefined }, now)).toBeNull();
    expect(toBook({ ...base, read_at: "soon" }, now)).toBeNull();
    expect(toBook(null, now)).toBeNull();
  });

  it("clamps progress and allows it or the author to be missing", () => {
    expect(toBook({ ...base, progress: 1.2 }, now)?.progress).toBe(1);
    expect(toBook({ ...base, progress: null }, now)?.progress).toBeNull();
    expect(toBook({ ...base, author: "" }, now)?.author).toBeNull();
  });
});
