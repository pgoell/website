import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "@/lib/trips/auth";
import { roadsThrough } from "@/lib/trips/road";
import type { LngLat } from "@/lib/trips/types";

export const dynamic = "force-dynamic";

const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * The roads between the points in `through` ("lng,lat;lng,lat"), one for each
 * stretch, for the route editor to show while a line is bent. Signed in only:
 * every question goes on to the public router.
 */
export async function GET(req: Request) {
  if (!(await readSession((await cookies()).get(SESSION_COOKIE)?.value))) {
    return Response.json(
      { error: "Not signed in" },
      { status: 401, headers: PRIVATE },
    );
  }
  const through = (new URL(req.url).searchParams.get("through") ?? "")
    .split(";")
    .map((p) => p.split(",").map(Number) as LngLat);
  const sound =
    through.length >= 2 &&
    through.length <= 25 &&
    through.every(
      (p) =>
        p.length === 2 &&
        Number.isFinite(p[0]) &&
        Number.isFinite(p[1]) &&
        Math.abs(p[0]) <= 180 &&
        Math.abs(p[1]) <= 90,
    );
  if (!sound)
    return Response.json(
      { error: "Bad points" },
      { status: 400, headers: PRIVATE },
    );
  try {
    return Response.json(
      { roads: await roadsThrough(through) },
      { headers: PRIVATE },
    );
  } catch {
    return Response.json(
      { error: "No answer" },
      { status: 502, headers: PRIVATE },
    );
  }
}
