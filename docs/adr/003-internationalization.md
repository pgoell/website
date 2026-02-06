# ADR-003: Internationalization

**Status:** Accepted
**Date:** 2026-02-06
**Decision Makers:** Pascal Kraus

## Context

As a bilingual (English/German) personal website, all user-facing text must be available in both languages. The i18n solution needs to integrate deeply with the Next.js App Router (supporting both server and client components), handle locale-based routing, and provide a type-safe developer experience with minimal boilerplate.

## Decision

### Library: next-intl

The project uses **next-intl ^4.8.1** (`package.json:42`), which provides first-class integration with Next.js App Router patterns including server components, middleware, and dynamic route segments.

### Locale Configuration

Locales are defined in `i18n/config.ts` with `as const` for TypeScript type safety:

```typescript
export const locales = ["en", "de"] as const;
export const defaultLocale = "en" as const;
export type Locale = (typeof locales)[number];
```

### Routing Strategy

- **Locale prefix:** `"always"` — all routes include the locale segment (`/en/blog`, `/de/blog`) (`proxy.ts:7`)
- **Dynamic segment:** `[locale]` in the app directory (`app/[locale]/layout.tsx`)
- **Middleware:** `proxy.ts` (Next.js 16 pattern) using `createMiddleware` from `next-intl/middleware` (`proxy.ts:1-14`)
  - Matcher: `["/", "/(en|de)/:path*"]` (`proxy.ts:12-13`)
- **Locale validation:** The locale layout validates the segment against the `locales` array and calls `notFound()` for invalid locales (`app/[locale]/layout.tsx:17-19`)

### Message Files

- **Location:** `messages/en.json` and `messages/de.json` (perfect parity maintained between files)
- **Loading:** Dynamic `import()` per locale in `i18n/request.ts:13` for code-splitting:
  ```typescript
  messages: (await import(`@/messages/${locale}.json`)).default
  ```
- **Provider:** `NextIntlClientProvider` wraps the app in the locale layout, passing all messages (`app/[locale]/layout.tsx:26`)

### Message Structure

- **Key naming:** camelCase, up to 4 levels deep
- **Top-level namespaces:** `home`, `nav`, `games`, `tools`, `pomodoro`
- **Nesting example:** `games.wordle.solver.controls.play`
- **Interpolation:** ICU-style with `{word}`, `{number}`, `{count}`, `{minutes}`, `{percent}`, `{preset}`
- **No ICU pluralization:** Uses simple `"{count} sessions"` pattern instead

### Component Patterns

| Pattern | Usage | Example |
|---------|-------|---------|
| Single namespace | Most components | `const t = useTranslations("nav")` |
| Multiple namespaces | Complex components | `const tTimer = useTranslations("pomodoro.timer")` (tPrefix convention) |
| Server-side | Async server components | `const t = await getTranslations("games")` |
| Dot notation | Nested key access | `t("cta.prefix")` |
| Locale-aware logic | Word list selection, routing | `const locale = useLocale()` |

### Known Inconsistency

The Wordle feature still uses inline locale checks (`locale === "de" ? "..." : "..."`) in some places instead of `useTranslations`. This predates the full i18n integration and should be migrated in a future cleanup pass.

## Consequences

### Positive
- `localePrefix: "always"` makes every URL unambiguous about its language, aiding SEO and link sharing
- Dynamic message imports ensure only the active locale's translations are loaded (code-split per locale)
- `as const` locale definition provides compile-time type safety for locale values
- Server-side `getTranslations` works in async server components without client-side overhead
- `NextIntlClientProvider` makes translations available to all client components without prop drilling
- next-intl's tight App Router integration handles server/client boundary transparently

### Negative
- `localePrefix: "always"` means bare `/blog` doesn't work — requires `/en/blog` (middleware redirects but adds a hop)
- Two message files must be kept in perfect sync manually; no build-time check for missing keys
- The Wordle inline locale check inconsistency creates a maintenance burden and inconsistent patterns
- No ICU pluralization means some translations are grammatically simplified

### Neutral
- The `proxy.ts` naming convention is specific to Next.js 16's middleware pattern (previously `middleware.ts`)
- Message files are ~174 lines each, manageable for a two-locale site
- The tPrefix convention (`tTimer`, `tStats`) for multiple namespace hooks is a project-specific pattern

## Alternatives Considered

| Alternative | Reason Not Chosen |
|------------|-------------------|
| react-i18next | Less integrated with Next.js App Router; requires more manual setup for server components |
| next-translate | Smaller ecosystem; less active maintenance compared to next-intl |
| Manual locale props | No middleware support; would require prop drilling through entire component tree |
| `localePrefix: "as-needed"` | Explicit locale in URL preferred for clarity and SEO; avoids ambiguity |
| ICU MessageFormat pluralization | Added complexity not justified for a two-locale personal site with simple copy |

## References

- `i18n/config.ts` — Locale definitions and type export
- `i18n/request.ts` — Message loading with dynamic imports
- `proxy.ts` — Middleware configuration (locale detection, prefix strategy)
- `app/[locale]/layout.tsx` — Locale validation, provider setup, html lang attribute
- `messages/en.json` — English translations
- `messages/de.json` — German translations
- `package.json:42` — next-intl version
