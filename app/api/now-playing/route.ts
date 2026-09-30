import { getNowPlaying } from "@/lib/stats/spotify";

export async function GET() {
  return Response.json(await getNowPlaying());
}
