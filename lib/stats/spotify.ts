/** Spotify stats: what plays now (or last), the last plays, and top tracks, artists and genres over three spans. */

const DAY = 86400;

export interface Track {
  title: string;
  artist: string;
  url: string;
}

export interface NowPlaying extends Track {
  /** False when this is the last played track rather than a live one. */
  playing: boolean;
}

interface ApiTrack {
  name: string;
  artists: { name: string }[];
  external_urls: { spotify: string };
  duration_ms?: number;
}

interface ApiArtist {
  name: string;
  genres?: string[];
  external_urls: { spotify: string };
}

/** The time spans Spotify ranks top artists and tracks over. */
export const RANGES = ["short_term", "medium_term", "long_term"] as const;
export type Range = (typeof RANGES)[number];

export interface Artist {
  name: string;
  url: string;
  genres: string[];
}

export interface Play extends Track {
  /** ISO time the play finished. */
  at: string;
  minutes: number;
}

/** What the stats panel shows: top lists for each span and the last plays. */
export interface SpotifyStats {
  top: Record<Range, { artists: Artist[]; tracks: Track[]; genres: string[] }>;
  recent: Play[];
  profile: string | null;
}

interface ApiEpisode {
  type: "episode";
  name: string;
  show: { name: string };
  external_urls: { spotify: string };
}

/** What the live readout gets: the track and a link to the profile for when there is none. */
export interface Listening {
  track: NowPlaying | null;
  profile: string | null;
}

let token: { value: string; expires: number } | null = null;

async function accessToken(): Promise<string | null> {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } =
    process.env;
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN)
    return null;
  if (token && token.expires > Date.now()) return token.value;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: SPOTIFY_REFRESH_TOKEN,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    // Most often a revoked or mistyped refresh token, or a lapsed Premium plan
    console.error(
      `Spotify token refresh failed: ${res.status} ${await res.text()}`,
    );
    return null;
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  token = {
    value: json.access_token,
    expires: Date.now() + (json.expires_in - 60) * 1000,
  };
  return token.value;
}

async function api<T>(path: string, revalidate: number): Promise<T | null> {
  const bearer = await accessToken();
  if (!bearer) return null;
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${bearer}` },
    next: { revalidate },
  });
  // 204 means nothing is playing
  if (res.status === 204) return null;
  if (!res.ok) {
    console.error(`Spotify ${path} failed: ${res.status}`);
    return null;
  }
  return res.json() as Promise<T>;
}

export const toTrack = (t: ApiTrack | ApiEpisode): Track =>
  "type" in t && t.type === "episode"
    ? { title: t.name, artist: t.show.name, url: t.external_urls.spotify }
    : {
        title: t.name,
        artist: (t as ApiTrack).artists.map((a) => a.name).join(", "),
        url: t.external_urls.spotify,
      };

/** The live track, else the last played one; null without credentials. */
export async function getNowPlaying(): Promise<NowPlaying | null> {
  try {
    // podcasts come back only when asked for; recently-played holds songs only
    const now = await api<{
      is_playing: boolean;
      item: ApiTrack | ApiEpisode | null;
    }>("/me/player/currently-playing?additional_types=episode", 30);
    if (now?.is_playing && now.item)
      return { ...toTrack(now.item), playing: true };
    const recent = await api<{ items: { track: ApiTrack }[] }>(
      "/me/player/recently-played?limit=1",
      30,
    );
    const last = recent?.items[0]?.track;
    return last ? { ...toTrack(last), playing: false } : null;
  } catch {
    return null;
  }
}

/** Link to the Spotify profile; the id comes with any token, no extra scope. */
export async function getProfileUrl(): Promise<string | null> {
  try {
    const me = await api<{ external_urls: { spotify: string } }>("/me", DAY);
    return me?.external_urls.spotify ?? null;
  } catch {
    return null;
  }
}

const toArtist = (a: ApiArtist): Artist => ({
  name: a.name,
  url: a.external_urls.spotify,
  genres: a.genres ?? [],
});

/** Genres of the top artists, weighted so the higher an artist ranks the more its genres count. */
export function topGenres(artists: readonly Artist[], n = 5): string[] {
  const score = new Map<string, number>();
  artists.forEach((a, i) => {
    for (const g of a.genres)
      score.set(g, (score.get(g) ?? 0) + (artists.length - i));
  });
  return [...score]
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .slice(0, n)
    .map(([g]) => g);
}

/** Plays and minutes on the given Berlin day; `capped` when every fetched play is that day, so there were more. */
export function dayTotals(
  plays: readonly Play[],
  day: string,
  dayOf: (iso: string) => string,
): { plays: number; minutes: number; capped: boolean } {
  const today = plays.filter((p) => dayOf(p.at) === day);
  return {
    plays: today.length,
    minutes: Math.round(today.reduce((m, p) => m + p.minutes, 0)),
    capped: today.length > 0 && today.length === plays.length,
  };
}

async function topFor(range: Range) {
  const [tracks, artists] = await Promise.all([
    api<{ items: ApiTrack[] }>(
      `/me/top/tracks?time_range=${range}&limit=10`,
      DAY,
    ),
    api<{ items: ApiArtist[] }>(
      `/me/top/artists?time_range=${range}&limit=20`,
      DAY,
    ),
  ]);
  if (!tracks || !artists) return null;
  const all = artists.items.map(toArtist);
  return {
    tracks: tracks.items.map(toTrack),
    artists: all.slice(0, 10),
    genres: topGenres(all),
  };
}

/** Everything the stats panel shows; null without credentials or when Spotify fails. */
export async function getSpotifyStats(): Promise<SpotifyStats | null> {
  try {
    const [short, medium, long, recent, profile] = await Promise.all([
      topFor("short_term"),
      topFor("medium_term"),
      topFor("long_term"),
      api<{ items: { track: ApiTrack; played_at: string }[] }>(
        "/me/player/recently-played?limit=50",
        300,
      ),
      getProfileUrl(),
    ]);
    if (!short || !medium || !long) return null;
    return {
      top: { short_term: short, medium_term: medium, long_term: long },
      recent: (recent?.items ?? []).map((i) => ({
        ...toTrack(i.track),
        at: i.played_at,
        minutes: (i.track.duration_ms ?? 0) / 60_000,
      })),
      profile,
    };
  } catch {
    return null;
  }
}
