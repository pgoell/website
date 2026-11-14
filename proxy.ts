import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "./i18n/config";
import { isHiddenPage } from "./lib/hidden-pages";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
  // keep the visitor's language for a year, not just this browser session
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});

export function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/(en|de)(\/.*)?$/);
  if (match && isHiddenPage(match[2] ?? "/")) {
    return NextResponse.redirect(new URL(`/${match[1]}`, request.url));
  }
  return intlMiddleware(request);
}

export const config = {
  // `/trips` without a locale is where trips.pgoell.com redirects to.
  matcher: ["/", "/(en|de)/:path*", "/trips", "/trips/:path*"],
};
