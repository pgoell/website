import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { savePlace } from "@/app/[locale]/(site)/trips/actions";
import { defaultLocale, locales } from "@/i18n/config";
import { appUrl, readSession, SESSION_COOKIE } from "@/lib/trips/auth";
import { db } from "@/lib/trips/db";
import { sharedIdea } from "@/lib/trips/share";
import { latestTripSlug } from "@/lib/trips/store";

// Target of the phone's share sheet, see share_target in trips.webmanifest.
// Whatever another app shares (a reel, a restaurant page, a map link) lands as
// an idea on the newest trip. Signed out, it goes through sign-in first.
export async function GET(req: NextRequest) {
  const base = appUrl();
  const jar = await cookies();
  if (!(await readSession(jar.get(SESSION_COOKIE)?.value))) {
    const here = `${base}/share${req.nextUrl.search}`;
    return NextResponse.redirect(
      `${base}/auth/login?next=${encodeURIComponent(here)}`,
    );
  }

  const slug = await latestTripSlug(await db());
  if (!slug)
    return new NextResponse("No trip to add this to.", { status: 404 });

  const idea = sharedIdea(req.nextUrl.searchParams);
  if (idea) {
    const failed = await savePlace(slug, {
      ...idea,
      tags: null,
      day: null,
      lat: null,
      lng: null,
      status: "idea",
    });
    if (failed) return new NextResponse(failed.error, { status: 400 });
  }
  const saved = jar.get("NEXT_LOCALE")?.value;
  const locale = locales.find((l) => l === saved) ?? defaultLocale;
  return NextResponse.redirect(`${base}/${locale}/trips/${slug}?tab=ideas`);
}
