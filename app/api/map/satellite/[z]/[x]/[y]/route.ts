import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "@/lib/trips/auth";
import { isSatelliteTile, satellite } from "@/lib/trips/tiles";

export const dynamic = "force-dynamic";

/**
 * One tile of satellite images, passed on from Esri, for the map of someone
 * signed in. Every tile counts against the key's free allowance, so a
 * visitor gets none.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> },
) {
  if (!(await readSession((await cookies()).get(SESSION_COOKIE)?.value)))
    return new Response(null, {
      status: 401,
      headers: { "Cache-Control": "private, no-store" },
    });
  const p = await params;
  const [z, x, y] = [p.z, p.x, p.y].map((v) =>
    /^\d{1,7}$/.test(v) ? Number(v) : Number.NaN,
  ) as [number, number, number];
  const key = process.env.ARCGIS_API_KEY;
  if (!key || !isSatelliteTile(z, x, y))
    return new Response(null, { status: 404 });
  return satellite(z, x, y, key);
}
