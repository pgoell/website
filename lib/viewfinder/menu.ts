/** The camera menu: tabs, groups and items, plus the search across all of them. */

export type MenuFlag = "soon" | "ph" | "ok";

export type MenuAction =
  /** Scroll to the map and lock the focus frame on a project pin. */
  | { kind: "pin"; index: number }
  /** Jump to a section on the home page. */
  | { kind: "section"; id: "work" | "more" | "contact" }
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

export type MenuIcon =
  | "star"
  | "cam"
  | "pen"
  | "play"
  | "book"
  | "disc"
  | "dice"
  | "box";

export interface MenuTabDef {
  id:
    | "main"
    | "work"
    | "writing"
    | "photos"
    | "books"
    | "music"
    | "play"
    | "setup";
  icon: MenuIcon;
  color: string;
  groups: MenuGroupDef[];
}

export interface PostLink {
  slug: string;
  title: string;
  date: string;
}

export const MAIL = "mailto:hello@pgoell.com";
export const GITHUB = "https://github.com/pgoell";
export const LINKEDIN = "https://www.linkedin.com/in/pascal7kraus/";

const route = (path: string): MenuAction => ({ kind: "route", path });
const external = (href: string): MenuAction => ({ kind: "external", href });
const pin = (index: number): MenuAction => ({ kind: "pin", index });
const contact: MenuAction = { kind: "section", id: "contact" };

export function buildMenu(posts: readonly PostLink[]): MenuTabDef[] {
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
          items: [
            { id: "hire", action: external(MAIL) },
            { id: "cv", flag: "soon" },
            { id: "github", action: external(GITHUB) },
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
          id: "agents",
          items: [
            { id: "gmail", action: pin(1) },
            { id: "ask", flag: "soon" },
          ],
        },
        {
          id: "tools",
          items: [
            { id: "klassenzeit", action: pin(0) },
            { id: "slides", action: pin(2) },
            { id: "football", action: pin(3) },
          ],
        },
        {
          id: "games",
          items: [
            { id: "wordleMap", action: pin(4) },
            { id: "kniffelMap", action: pin(4) },
            { id: "pomodoroMap", action: pin(4) },
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
      id: "photos",
      icon: "play",
      color: "#3aa0ff",
      groups: [
        {
          id: "kinzigtal",
          items: [
            { id: "photo1", flag: "ph" },
            { id: "photo2", flag: "ph" },
            { id: "photo3", flag: "ph" },
          ],
        },
      ],
    },
    {
      id: "books",
      icon: "book",
      color: "#47d17a",
      groups: [
        {
          id: "read",
          items: [
            { id: "bookA", flag: "ph" },
            { id: "bookB", flag: "ph" },
          ],
        },
        { id: "notRead", items: [{ id: "bookC", flag: "ph" }] },
      ],
    },
    {
      id: "music",
      icon: "disc",
      color: "#b07bff",
      groups: [
        {
          id: "onRepeat",
          items: [
            { id: "recordA", flag: "ph" },
            { id: "recordB", flag: "ph" },
          ],
        },
      ],
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

/** What Enter does on an entry: soon entries do nothing, entries without an action jump to the folders. */
export function actionFor(def: MenuItemDef): MenuAction | null {
  if (def.flag === "soon") return null;
  return def.action ?? { kind: "section", id: "more" };
}
