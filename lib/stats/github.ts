/** GitHub stats for the home page: contributions per day, last push, languages. */

const LOGIN = "pgoell";
const DAYS = 64;
const HOUR = 3600;

export interface GithubStats {
  /** Contributions per day, oldest first, the last 64 days. */
  days: number[];
  lastPush: { repo: string; sha: string; at: string } | null;
  /** Share of public code by language, largest first, top five. */
  languages: { name: string; share: number }[];
}

interface CalendarDay {
  contributionCount: number;
}
interface LanguageEdge {
  size: number;
  node: { name: string };
}
interface GraphResponse {
  data?: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          weeks: { contributionDays: CalendarDay[] }[];
        };
      };
      repositories: { nodes: { languages: { edges: LanguageEdge[] } }[] };
    };
  };
}
interface PushEvent {
  type: string;
  created_at: string;
  repo: { name: string };
  payload: { head?: string };
}

const QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar { weeks { contributionDays { contributionCount } } }
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
      nodes { languages(first: 10) { edges { size node { name } } } }
    }
  }
}`;

/** Adds up language sizes across repos and returns the top five shares. */
export function languageShares(
  repos: { languages: { edges: LanguageEdge[] } }[],
): GithubStats["languages"] {
  const bytes = new Map<string, number>();
  for (const r of repos)
    for (const e of r.languages.edges)
      bytes.set(e.node.name, (bytes.get(e.node.name) ?? 0) + e.size);
  const total = [...bytes.values()].reduce((a, b) => a + b, 0);
  if (!total) return [];
  return [...bytes]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, size]) => ({ name, share: size / total }));
}

/** Null without GITHUB_TOKEN or when GitHub fails; the page then shows sample data. */
export async function getGithubStats(): Promise<GithubStats | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const [graph, events] = await Promise.all([
      fetch("https://api.github.com/graphql", {
        method: "POST",
        headers,
        body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
        next: { revalidate: HOUR },
      }).then((r) => r.json() as Promise<GraphResponse>),
      fetch(`https://api.github.com/users/${LOGIN}/events/public`, {
        headers,
        next: { revalidate: HOUR },
      }).then((r) => r.json() as Promise<PushEvent[]>),
    ]);
    const user = graph.data?.user;
    if (!user) return null;
    const days = user.contributionsCollection.contributionCalendar.weeks
      .flatMap((w) => w.contributionDays.map((d) => d.contributionCount))
      .slice(-DAYS);
    const push = events.find((e) => e.type === "PushEvent");
    return {
      days,
      lastPush: push?.payload.head
        ? {
            repo: push.repo.name.replace(`${LOGIN}/`, ""),
            sha: push.payload.head.slice(0, 7),
            at: push.created_at,
          }
        : null,
      languages: languageShares(user.repositories.nodes),
    };
  } catch {
    return null;
  }
}
