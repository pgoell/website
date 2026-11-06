import {
  getNowPlaying,
  getProfileUrl,
  type Listening,
} from "@/lib/stats/spotify";

export async function GET() {
  const [track, profile] = await Promise.all([
    getNowPlaying(),
    getProfileUrl(),
  ]);
  return Response.json({ track, profile } satisfies Listening);
}
