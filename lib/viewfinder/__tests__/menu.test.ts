import { describe, expect, it } from "vitest";
import { actionFor, buildMenu, type MenuEntry, searchMenu } from "../menu";

const posts = [
  { slug: "hello-world", title: "Hello World", date: "2025-02-01" },
];

describe("buildMenu", () => {
  const tabs = buildMenu(posts);

  it("has the eight camera tabs", () => {
    expect(tabs.map((t) => t.id)).toEqual([
      "main",
      "work",
      "writing",
      "photos",
      "books",
      "music",
      "play",
      "setup",
    ]);
  });

  it("lists blog posts under writing", () => {
    const items = tabs.find((t) => t.id === "writing")?.groups[0]?.items ?? [];
    expect(items[0]).toMatchObject({
      title: "Hello World",
      action: { kind: "route", path: "/blog/hello-world" },
    });
  });

  it("links every page of the site", () => {
    const paths = tabs.flatMap((t) =>
      t.groups.flatMap((g) =>
        g.items.flatMap((i) =>
          i.action?.kind === "route" ? [i.action.path] : [],
        ),
      ),
    );
    for (const p of [
      "/blog",
      "/games",
      "/games/wordle",
      "/games/kniffel",
      "/games/bingo",
      "/tools",
      "/tools/pomodoro",
    ])
      expect(paths).toContain(p);
  });
});

describe("actionFor", () => {
  it("does nothing for soon entries", () => {
    expect(actionFor({ id: "ask", flag: "soon" })).toBeNull();
  });
  it("falls back to the folders section", () => {
    expect(actionFor({ id: "photo1", flag: "ph" })).toEqual({
      kind: "section",
      id: "more",
    });
  });
});

describe("searchMenu", () => {
  const e = (
    title: string,
    value: string,
    tabName: string,
    group: string,
  ): MenuEntry => ({
    def: { id: title },
    title,
    value,
    tab: 0,
    tabName,
    group,
  });
  const entries = [
    e("Gmail brief agent", "inbox to brief", "Work", "Agents"),
    e("Kniffel", "dice game", "Play", "In browser"),
  ];

  it("matches title, value, tab and group, ignoring case", () => {
    expect(searchMenu(entries, "AGENT")).toHaveLength(1);
    expect(searchMenu(entries, "dice")).toHaveLength(1);
    expect(searchMenu(entries, "play")).toHaveLength(1);
    expect(searchMenu(entries, "agents")).toHaveLength(1);
  });
  it("returns nothing for an empty or unmatched query", () => {
    expect(searchMenu(entries, "  ")).toEqual([]);
    expect(searchMenu(entries, "zzz")).toEqual([]);
  });
});
