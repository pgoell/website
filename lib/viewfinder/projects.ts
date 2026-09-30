export type ArtKind = "grid" | "mail" | "slides" | "pitch" | "dice";

export type ProjectId =
  | "klassenzeit"
  | "gmail"
  | "slides"
  | "football"
  | "games";

export interface Project {
  id: ProjectId;
  /** Project names stay the same in every language. */
  name: string;
  art: ArtKind;
  /** Repo name shown in the playback window. */
  repo: string;
  /** Public repository; absent for private work. */
  href?: string;
  /** Page on this site (without the locale) that "Open" leads to instead of the repo. */
  route?: string;
  /** Pin position on the map, as a fraction of its width and height. */
  x: number;
  y: number;
}

export const PROJECTS: readonly Project[] = [
  {
    id: "klassenzeit",
    name: "Klassenzeit",
    art: "grid",
    repo: "Klassenzeit",
    href: "https://github.com/pgoell/Klassenzeit",
    x: 0.22,
    y: 0.2,
  },
  {
    id: "gmail",
    name: "Gmail brief agent",
    art: "mail",
    repo: "gmail-brief-agent",
    href: "https://github.com/pgoell/gmail-brief-agent",
    x: 0.6,
    y: 0.15,
  },
  {
    id: "slides",
    name: "Slides as code",
    art: "slides",
    repo: "presentations",
    x: 0.85,
    y: 0.25,
  },
  {
    id: "football",
    name: "Football forecasting",
    art: "pitch",
    repo: "football-forecasting",
    href: "https://github.com/pgoell/football-forecasting",
    x: 0.3,
    y: 0.82,
  },
  {
    id: "games",
    name: "Games",
    art: "dice",
    repo: "website",
    href: "https://github.com/pgoell/website",
    route: "/games",
    x: 0.7,
    y: 0.8,
  },
];
