/** GitHub stats for the home page: contributions per week, last push, languages. */

const LOGIN = "pgoell";
const WEEKS = 52;
const HOUR = 3600;

export interface GithubStats {
  /** Contributions per week, oldest first, the last 52 weeks. */
  weeks: number[];
  lastPush: { repo: string; sha: string; at: string } | null;
  /** Share of public code by language, largest first, top five. */
  languages: { name: string; share: number }[];
}

interface Repo {
  fork: boolean;
  /** Main language, null for a repo without code. */
  language: string | null;
  /** Repo size in KB. */
  size: number;
}
interface PushEvent {
  type: string;
  created_at: string;
  repo: { name: string };
  payload: { head?: string };
}

/**
 * Reads the public profile calendar: each day is a cell with a date and an id,
 * and a tooltip for that id carries the count ("12 contributions on …").
 * Returns sums over seven days, the last week ending today.
 */
export function contributionWeeks(html: string): number[] {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>(\d*)/g))
    counts.set(m[1] as string, Number(m[2]));
  const days: [string, number][] = [];
  for (const [cell] of html.matchAll(/<td[^>]*\bdata-date="[^>]*>/g)) {
    const date = /\bdata-date="([^"]+)"/.exec(cell)?.[1];
    const id = /\bid="([^"]+)"/.exec(cell)?.[1];
    if (date && id) days.push([date, counts.get(id) ?? 0]);
  }
  const last = days
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-WEEKS * 7)
    .map((d) => d[1]);
  const weeks: number[] = [];
  for (let i = last.length; i > 0; i -= 7)
    weeks.unshift(last.slice(Math.max(0, i - 7), i).reduce((a, b) => a + b, 0));
  return weeks;
}

/** Weighs each repo's main language by repo size and returns the top five shares. */
export function languageShares(repos: Repo[]): GithubStats["languages"] {
  const sizes = new Map<string, number>();
  for (const r of repos)
    if (!r.fork && r.language)
      sizes.set(r.language, (sizes.get(r.language) ?? 0) + r.size);
  const total = [...sizes.values()].reduce((a, b) => a + b, 0);
  if (!total) return [];
  return [...sizes]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, size]) => ({ name, share: size / total }));
}

/** Public pages only, no token. Null when GitHub fails; the page then shows sample data. */
export async function getGithubStats(): Promise<GithubStats | null> {
  const get = (url: string) =>
    fetch(url, { next: { revalidate: HOUR } }).then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r;
    });
  try {
    const [html, events, repos] = await Promise.all([
      get(`https://github.com/users/${LOGIN}/contributions`).then((r) =>
        r.text(),
      ),
      get(`https://api.github.com/users/${LOGIN}/events/public`).then(
        (r) => r.json() as Promise<PushEvent[]>,
      ),
      get(
        `https://api.github.com/users/${LOGIN}/repos?type=owner&per_page=100`,
      ).then((r) => r.json() as Promise<Repo[]>),
    ]);
    const weeks = contributionWeeks(html);
    if (!weeks.length) return null;
    const push = events.find((e) => e.type === "PushEvent");
    return {
      weeks,
      lastPush: push?.payload.head
        ? {
            repo: push.repo.name.replace(`${LOGIN}/`, ""),
            sha: push.payload.head.slice(0, 7),
            at: push.created_at,
          }
        : null,
      languages: languageShares(repos),
    };
  } catch {
    return null;
  }
}
