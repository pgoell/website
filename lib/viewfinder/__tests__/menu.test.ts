import { describe, expect, it } from "vitest";
import { isHiddenPage } from "@/lib/hidden-pages";
import {
  actionFor,
  buildMenu,
  type MenuEntry,
  searchMenu,
  visibleMenu,
} from "../menu";

const posts = [
  { slug: "hello-world", title: "Hello World", date: "2025-02-01" },
];

describe("buildMenu", () => {
  const tabs = buildMenu(posts);

  it("has the six camera tabs", () => {
    expect(tabs.map((t) => t.id)).toEqual([
      "main",
      "work",
      "writing",
      "music",
      "play",
      "setup",
    ]);
  });

  it("leaves music empty without Spotify", () => {
    expect(tabs.find((t) => t.id === "music")?.groups).toEqual([]);
    expect(visibleMenu(tabs).map((t) => t.id)).not.toContain("music");
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
    expect(actionFor({ id: "cv", flag: "soon" })).toBeNull();
  });
  it("falls back to the folders section", () => {
    expect(actionFor({ id: "stack" })).toEqual({
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

describe("visibleMenu", () => {
  const tabs = visibleMenu(buildMenu(posts));
  const paths = tabs.flatMap((t) =>
    t.groups.flatMap((g) =>
      g.items.flatMap((i) =>
        i.action?.kind === "route" ? [i.action.path] : [],
      ),
    ),
  );

  it("links no hidden page", () => {
    expect(paths.filter(isHiddenPage)).toEqual([]);
  });

  it("drops tabs left empty", () => {
    expect(tabs.map((t) => t.id)).not.toContain("writing");
    expect(tabs.map((t) => t.id)).not.toContain("play");
    expect(tabs.map((t) => t.id)).toContain("work");
  });
});

describe("visibleMenu pins", () => {
  it("drops pins to projects that left the map", () => {
    const tabs = visibleMenu(buildMenu(posts));
    const work = tabs.find((t) => t.id === "work");
    expect(work?.groups.map((g) => g.id)).not.toContain("games");
  });
});
