import { describe, expect, it } from "vitest";
import { isHiddenPage } from "@/lib/hidden-pages";
import {
  actionFor,
  buildMenu,
  type MenuEntry,
  musicGroups,
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
  it("does nothing for entries without an action", () => {
    expect(actionFor({ id: "stack" })).toBeNull();
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

describe("musicGroups", () => {
  const url = "https://open.spotify.com/x";
  const song = (title: string) => ({
    title,
    artist: "A",
    url: `${url}/${title}`,
  });
  const top = {
    artists: [{ name: "A", url, genres: ["jazz"] }],
    tracks: [song("Top")],
    genres: ["jazz"],
  };
  const stats = {
    top: {
      short_term: top,
      medium_term: { ...top, tracks: [song("Mid")] },
      long_term: top,
    },
    recent: [
      { ...song("Last"), at: "2026-11-14T07:50:00Z", minutes: 3 },
      { ...song("Before"), at: "2026-11-14T07:40:00Z", minutes: 4 },
    ],
    profile: url,
  };
  const now = new Date("2026-11-14T08:00:00Z");

  it("is empty with nothing from Spotify", () => {
    expect(musicGroups(null, null, "short_term", now)).toEqual([]);
  });

  it("shows the last played song once, then today's total and recent plays", () => {
    const listening = {
      track: { ...song("Last"), playing: false },
      profile: url,
    };
    const [first] = musicGroups(stats, listening, "short_term", now);
    expect(first?.items.map((i) => i.title ?? i.id)).toEqual([
      "Last",
      "today",
      "Before",
      "spotifyProfile",
    ]);
    expect(first?.items[1]?.vars).toEqual({ plays: "2+", minutes: 7 });
    expect(first?.items[2]?.value).toBe("A · 20M");
  });

  it("tags a live song and follows the chosen span", () => {
    const listening = {
      track: { ...song("Now"), playing: true },
      profile: url,
    };
    const groups = musicGroups(stats, listening, "medium_term", now);
    expect(groups[0]?.items[0]?.flag).toBe("live");
    expect(groups.find((g) => g.id === "topTracks")?.items[0]?.title).toBe(
      "Mid",
    );
    expect(groups.filter((g) => g.ranged).map((g) => g.id)).toEqual([
      "topArtists",
      "topTracks",
      "genres",
    ]);
  });
});
