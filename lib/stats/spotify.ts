/** Spotify stats: what plays now (or last) and the top tracks and artists of the last four weeks. */

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

export interface SpotifyTop {
  tracks: Track[];
  artists: { name: string; url: string }[];
}

interface ApiTrack {
  name: string;
  artists: { name: string }[];
  external_urls: { spotify: string };
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
  if (!res.ok) return null;
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
  if (res.status === 204 || !res.ok) return null;
  return res.json() as Promise<T>;
}

const toTrack = (t: ApiTrack): Track => ({
  title: t.name,
  artist: t.artists.map((a) => a.name).join(", "),
  url: t.external_urls.spotify,
});

/** The live track, else the last played one; null without credentials. */
export async function getNowPlaying(): Promise<NowPlaying | null> {
  try {
    const now = await api<{ is_playing: boolean; item: ApiTrack | null }>(
      "/me/player/currently-playing",
      30,
    );
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

export async function getSpotifyTop(): Promise<SpotifyTop | null> {
  try {
    const [tracks, artists] = await Promise.all([
      api<{ items: ApiTrack[] }>(
        "/me/top/tracks?time_range=short_term&limit=5",
        DAY,
      ),
      api<{ items: { name: string; external_urls: { spotify: string } }[] }>(
        "/me/top/artists?time_range=short_term&limit=3",
        DAY,
      ),
    ]);
    if (!tracks || !artists) return null;
    return {
      tracks: tracks.items.map(toTrack),
      artists: artists.items.map((a) => ({
        name: a.name,
        url: a.external_urls.spotify,
      })),
    };
  } catch {
    return null;
  }
}
