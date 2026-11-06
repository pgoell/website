/** The camera menu: tabs, groups and items, plus the search across all of them. */

import { isHiddenPage } from "@/lib/hidden-pages";
import type { GithubStats } from "@/lib/stats/github";
import type { SpotifyTop } from "@/lib/stats/spotify";
import { PROJECTS } from "./projects";

export type MenuFlag = "soon" | "ok";

export type MenuAction =
  /** Open a project's playback window. */
  | { kind: "project"; index: number }
  /** Another page of this site, without the locale prefix. */
  | { kind: "route"; path: string }
  | { kind: "external"; href: string }
  | { kind: "locale" };

export interface MenuItemDef {
  /** Message key under home.menu.items, unless `title` is given. */
  id: string;
  /** Literal title and value, for entries that come from content (blog posts). */
  title?: string;
  value?: string;
  flag?: MenuFlag;
  action?: MenuAction;
}

export interface MenuGroupDef {
  id: string;
  items: MenuItemDef[];
}

export type MenuIcon = "star" | "cam" | "pen" | "disc" | "dice" | "box";

export interface MenuTabDef {
  id: "main" | "work" | "writing" | "music" | "play" | "setup";
  icon: MenuIcon;
  color: string;
  groups: MenuGroupDef[];
}

export interface PostLink {
  slug: string;
  title: string;
  date: string;
}

/** Live stats behind the languages and music entries; either may be missing. */
export interface MenuStats {
  github?: GithubStats | null;
  spotify?: SpotifyTop | null;
}

export const MAIL = "mailto:hello@pgoell.com";
export const GITHUB = "https://github.com/pgoell";
export const LINKEDIN = "https://www.linkedin.com/in/pascal7kraus/";
export const X = "https://x.com/pagoell";

const route = (path: string): MenuAction => ({ kind: "route", path });
const external = (href: string): MenuAction => ({ kind: "external", href });
const project = (index: number): MenuAction => ({ kind: "project", index });
const contact = external(MAIL);

export function buildMenu(
  posts: readonly PostLink[],
  { github, spotify }: MenuStats = {},
): MenuTabDef[] {
  return [
    {
      id: "main",
      icon: "star",
      color: "#d9d9d9",
      groups: [
        {
          id: "glance",
          items: [
            { id: "name" },
            { id: "role" },
            { id: "based" },
            { id: "freelance", flag: "ok", action: contact },
            { id: "stack" },
            { id: "camera" },
          ],
        },
        {
          id: "shortcuts",
          items: [{ id: "github", action: external(GITHUB) }],
        },
      ],
    },
    {
      id: "work",
      icon: "cam",
      color: "#ff4d7a",
      groups: [
        {
          id: "agents",
          items: [{ id: "gmail", action: project(1) }],
        },
        {
          id: "tools",
          items: [
            { id: "klassenzeit", action: project(0) },
            { id: "slides", action: project(2) },
            { id: "football", action: project(3) },
          ],
        },
        ...(github?.languages.length
          ? [
              {
                id: "languages",
                items: github.languages.map((l) => ({
                  id: `lang-${l.name}`,
                  title: l.name,
                  value: `${Math.round(l.share * 100)}%`,
                  action: external(GITHUB),
                })),
              },
            ]
          : []),
        {
          id: "games",
          items: [
            { id: "wordleMap", action: project(4) },
            { id: "kniffelMap", action: project(4) },
            { id: "pomodoroMap", action: project(4) },
          ],
        },
      ],
    },
    {
      id: "writing",
      icon: "pen",
      color: "#ff9d2e",
      groups: [
        {
          id: "posts",
          items: [
            ...posts.map((p) => ({
              id: `post-${p.slug}`,
              title: p.title,
              value: p.date,
              action: route(`/blog/${p.slug}`),
            })),
            { id: "allPosts", action: route("/blog") },
          ],
        },
      ],
    },
    {
      id: "music",
      icon: "disc",
      color: "#b07bff",
      // empty without Spotify, and then dropped by visibleMenu
      groups: spotify
        ? [
            {
              id: "onRepeat",
              items: spotify.tracks.map((t, i) => ({
                id: `track-${i}`,
                title: t.title,
                value: t.artist,
                action: external(t.url),
              })),
            },
            {
              id: "topArtists",
              items: spotify.artists.map((a, i) => ({
                id: `artist-${i}`,
                title: a.name,
                value: `#${i + 1}`,
                action: external(a.url),
              })),
            },
          ]
        : [],
    },
    {
      id: "play",
      icon: "dice",
      color: "#2ec4b6",
      groups: [
        {
          id: "inBrowser",
          items: [
            { id: "wordle", action: route("/games/wordle") },
            { id: "kniffel", action: route("/games/kniffel") },
            { id: "bingo", action: route("/games/bingo") },
            { id: "pomodoro", action: route("/tools/pomodoro") },
            { id: "allGames", action: route("/games") },
            { id: "allTools", action: route("/tools") },
          ],
        },
      ],
    },
    {
      id: "setup",
      icon: "box",
      color: "#f2d13b",
      groups: [
        {
          id: "contact",
          items: [
            { id: "email", action: external(MAIL) },
            { id: "githubContact", action: external(GITHUB) },
            { id: "linkedin", action: external(LINKEDIN) },
            { id: "x", action: external(X) },
          ],
        },
        {
          id: "display",
          items: [
            { id: "light" },
            { id: "readouts" },
            { id: "histogram" },
            { id: "language", action: { kind: "locale" } },
          ],
        },
      ],
    },
  ];
}

/** A menu entry with its labels resolved for the current language. */
export interface MenuEntry {
  def: MenuItemDef;
  title: string;
  value: string;
  tab: number;
  tabName: string;
  group: string;
}

/** Case-insensitive search across title, value, tab and group names. */
export function searchMenu(
  entries: readonly MenuEntry[],
  query: string,
): MenuEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return entries.filter((e) =>
    `${e.title} ${e.value} ${e.tabName} ${e.group}`.toLowerCase().includes(q),
  );
}

/** What Enter does on an entry: soon entries and entries without an action do nothing. */
export function actionFor(def: MenuItemDef): MenuAction | null {
  if (def.flag === "soon") return null;
  return def.action ?? null;
}

const isHidden = ({ action }: MenuItemDef) =>
  (action?.kind === "route" && isHiddenPage(action.path)) ||
  (action?.kind === "project" && !PROJECTS[action.index]);

/** Drops links to hidden pages or projects, then any group or tab left empty. */
export function visibleMenu(tabs: readonly MenuTabDef[]): MenuTabDef[] {
  return tabs
    .map((tab) => ({
      ...tab,
      groups: tab.groups
        .map((g) => ({
          ...g,
          items: g.items.filter((i) => !isHidden(i)),
        }))
        .filter((g) => g.items.length > 0),
    }))
    .filter((tab) => tab.groups.length > 0);
}
