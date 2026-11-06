import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "./i18n/config";
import { isHiddenPage } from "./lib/hidden-pages";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/(en|de)(\/.*)?$/);
  if (match && isHiddenPage(match[2] ?? "/")) {
    return NextResponse.redirect(new URL(`/${match[1]}`, request.url));
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/", "/(en|de)/:path*"],
};
