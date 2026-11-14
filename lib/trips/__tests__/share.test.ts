import { describe, expect, it } from "vitest";
import { sharedIdea } from "../share";

const of = (q: Record<string, string>) => sharedIdea(new URLSearchParams(q));

describe("sharedIdea", () => {
  it("takes the link from url or from inside text", () => {
    expect(of({ title: "Ramen place", url: "https://example.com/r" })).toEqual({
      name: "Ramen place",
      url: "https://example.com/r",
      note: null,
    });
    expect(of({ text: "Look at this https://example.com/x" })).toEqual({
      name: "Look at this",
      url: "https://example.com/x",
      note: null,
    });
  });

  it("keeps the words as a note when there is a title too", () => {
    expect(
      of({ title: "Reel", text: "best sushi https://example.com/s" }),
    ).toEqual({
      name: "Reel",
      url: "https://example.com/s",
      note: "best sushi",
    });
  });

  it("falls back to the host for a bare link", () => {
    expect(of({ text: "https://www.example.com/p" })?.name).toBe("example.com");
  });

  it("cuts a long name and keeps it whole as the note", () => {
    const long = "x".repeat(100);
    expect(of({ text: long })).toEqual({
      name: "x".repeat(80),
      url: null,
      note: long,
    });
  });

  it("is nothing when nothing came", () => {
    expect(of({})).toBeNull();
  });
});
