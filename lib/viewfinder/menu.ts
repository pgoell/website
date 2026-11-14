/** The camera menu: tabs, groups and items, plus the search across all of them. */

import { isHiddenPage } from "@/lib/hidden-pages";
import type { GithubStats } from "@/lib/stats/github";
import {
  dayTotals,
  type Listening,
  type Range,
  type SpotifyStats,
} from "@/lib/stats/spotify";
import { PROJECTS } from "./projects";
import { berlinParts, sinceLabel } from "./time";

export type MenuFlag = "soon" | "ok" | "live" | "private";

export type MenuAction =
  /** Open a project's playback window. */
  | { kind: "project"; index: number }
  /** Another page of this site, without the locale prefix. */
  | { kind: "route"; path: string }
  /** Another site, in a new tab; `sameTab` for a sign-in that comes back here. */
  | { kind: "external"; href: string; sameTab?: boolean }
  | { kind: "locale" };

export interface MenuItemDef {
  /** Message key under home.menu.items, unless `title` is given. */
  id: string;
  /** Literal title and value, for entries that come from content (blog posts). */
  title?: string;
  value?: string;
  /** Values for the message's placeholders, such as a count. */
  vars?: Record<string, string | number>;
  flag?: MenuFlag;
  action?: MenuAction;
}

export interface MenuGroupDef {
  id: string;
  items: MenuItemDef[];
  /** Its items follow the chosen Spotify time span, so the menu shows the span switch over them. */
  ranged?: boolean;
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

/** A trip, with its dates already written out. */
export interface TripLink {
  slug: string;
  name: string;
  when: string;
  /** Only for someone signed in. */
  private?: boolean;
}

/** The Sign in row: who is signed in, or where to sign in. */
export type TripsAccount = { name: string } | { signIn: string };

/** Live stats behind the languages and music entries; any may be missing. */
export interface MenuStats {
  github?: GithubStats | null;
  spotify?: SpotifyStats | null;
  /** What plays now, refreshed on the page. */
  listening?: Listening | null;
  /** The time span the top lists show. */
  range?: Range;
  now?: Date;
}

export const MAIL = "mailto:hello@pgoell.com";
export const GITHUB = "https://github.com/pgoell";
export const LINKEDIN = "https://www.linkedin.com/in/pascal7kraus/";
export const X = "https://x.com/pagoell";

const route = (path: string): MenuAction => ({ kind: "route", path });
const external = (href: string): MenuAction => ({ kind: "external", href });

export function buildMenu(
  posts: readonly PostLink[],
  {
    spotify,
    listening,
    range = "short_term",
    now = new Date(),
  }: MenuStats = {},
  trips: readonly TripLink[] = [],
  account: TripsAccount = { signIn: "/auth/login" },
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
            { id: "freelance", flag: "ok" },
            { id: "stack" },
            { id: "camera" },
          ],
        },
      ],
    },
    {
      id: "work",
      icon: "cam",
      color: "#ff4d7a",
      groups: [
        {
          id: "trips",
          items: [
            ...trips.map((trip) => ({
              id: `trip-${trip.slug}`,
              title: trip.name,
              value: trip.when,
              action: route(`/trips/${trip.slug}`),
              ...(trip.private ? { flag: "private" as const } : {}),
            })),
            // once signed in, the private trips join the list above
            "name" in account
              ? {
                  id: "tripsSignedIn",
                  title: account.name,
                  action: route("/trips"),
                }
              : {
                  id: "tripsSignIn",
                  action: {
                    kind: "external" as const,
                    href: account.signIn,
                    sameTab: true,
                  },
                },
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
      groups: musicGroups(spotify ?? null, listening ?? null, range, now),
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

const RECENT = 12;
const dayOf = (iso: string) => berlinParts(new Date(iso)).date;

/** The Music tab: what plays and played, then top artists, tracks and genres over the chosen span. */
export function musicGroups(
  spotify: SpotifyStats | null,
  listening: Listening | null,
  range: Range,
  now: Date,
): MenuGroupDef[] {
  const track = listening?.track ?? null;
  const recent = spotify?.recent ?? [];
  // the song on top is often also the first recent play; show it once
  const plays =
    track && recent[0]?.url === track.url ? recent.slice(1) : recent;
  const today = dayTotals(recent, berlinParts(now).date, dayOf);
  const profile = spotify?.profile ?? listening?.profile ?? null;
  const listeningItems: MenuItemDef[] = [
    ...(track
      ? [
          {
            id: "nowPlaying",
            title: track.title,
            value: track.artist,
            flag: track.playing ? ("live" as const) : undefined,
            action: external(track.url),
          },
        ]
      : []),
    ...(today.plays > 0
      ? [
          {
            id: "today",
            vars: {
              plays: `${today.plays}${today.capped ? "+" : ""}`,
              minutes: today.minutes,
            },
          },
        ]
      : []),
    ...plays.slice(0, RECENT).map((p) => ({
      id: `play-${p.at}`,
      title: p.title,
      value: `${p.artist} · ${sinceLabel(p.at, now)}`,
      action: external(p.url),
    })),
    ...(profile ? [{ id: "spotifyProfile", action: external(profile) }] : []),
  ];
  const top = spotify?.top[range];
  if (!top) return track ? [{ id: "listening", items: listeningItems }] : [];
  return [
    { id: "listening", items: listeningItems },
    {
      id: "topArtists",
      ranged: true,
      items: top.artists.map((a, i) => ({
        id: `artist-${i}`,
        title: a.name,
        value: a.genres.slice(0, 2).join(", "),
        action: external(a.url),
      })),
    },
    {
      id: "topTracks",
      ranged: true,
      items: top.tracks.map((t, i) => ({
        id: `track-${i}`,
        title: t.title,
        value: t.artist,
        action: external(t.url),
      })),
    },
    {
      id: "genres",
      ranged: true,
      items: top.genres.map((g) => ({
        id: `genre-${g}`,
        title: g,
        value: top.artists
          .filter((a) => a.genres.includes(g))
          .slice(0, 3)
          .map((a) => a.name)
          .join(", "),
      })),
    },
  ];
}
