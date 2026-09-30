import { describe, expect, it } from "vitest";
import { languageShares } from "../github";

const repo = (...langs: [string, number][]) => ({
  languages: {
    edges: langs.map(([name, size]) => ({ size, node: { name } })),
  },
});

describe("languageShares", () => {
  it("adds bytes across repos and sorts by share", () => {
    expect(
      languageShares([
        repo(["Python", 300], ["CSS", 100]),
        repo(["TypeScript", 600]),
      ]),
    ).toEqual([
      { name: "TypeScript", share: 0.6 },
      { name: "Python", share: 0.3 },
      { name: "CSS", share: 0.1 },
    ]);
  });

  it("returns nothing for repos without code", () => {
    expect(languageShares([repo()])).toEqual([]);
  });
});
