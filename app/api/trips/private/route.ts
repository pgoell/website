import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/trips/auth";
import { allTrips } from "@/lib/trips/db";
import { shownCard } from "@/lib/trips/shown";

export const dynamic = "force-dynamic";

const PRIVATE = { "Cache-Control": "private, no-store" };

// Who is signed in and every trip, private ones too, for the trip pages and
// the camera menu.
export async function GET() {
  const user = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user)
    return NextResponse.json(
      { error: "signed out" },
      { status: 401, headers: PRIVATE },
    );
  const trips = (await allTrips()).map(shownCard);
  return NextResponse.json({ name: user.name, trips }, { headers: PRIVATE });
}
