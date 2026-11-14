import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/trips/auth";
import { getStoredTrip } from "@/lib/trips/db";
import { shownTrip } from "@/lib/trips/shown";

export const dynamic = "force-dynamic";

const PRIVATE = { "Cache-Control": "private, no-store" };

// Any trip by slug, open or not, for someone signed in.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const user = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user)
    return NextResponse.json(
      { error: "signed out" },
      { status: 401, headers: PRIVATE },
    );
  const trip = await getStoredTrip((await params).slug);
  if (!trip)
    return NextResponse.json(
      { error: "no such trip" },
      { status: 404, headers: PRIVATE },
    );
  return NextResponse.json(
    { trip: { ...shownTrip(trip), public: trip.public } },
    { headers: PRIVATE },
  );
}
