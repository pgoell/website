import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "./i18n/config";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export const proxy = intlMiddleware;

export const config = {
  matcher: ["/", "/(en|de)/:path*"],
};
