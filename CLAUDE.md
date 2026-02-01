# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev      # Start dev server
bun run build    # Production build
bun run check    # Run Biome linter
bun run fix      # Auto-fix linting issues

make check       # Lint + build
make setup       # Initial setup (checks bun/jj)
```

## Version Control: Jujutsu (jj)

This project uses **jj** as the primary VCS (Git-compatible). Changes auto-track—no staging needed.

```bash
jj status                              # Check status
jj log                                 # View history
jj new                                 # Start new work
jj describe -m "feat: message"         # Add commit message
jj bookmark create feature/name        # Create branch
jj git push --bookmark feature/name    # Push to GitHub
jj git fetch && jj rebase -d main      # Sync with main
```

**Branch naming:** `feature/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`, `perf/`

**Commit format:** `type: description` (feat, fix, chore, docs, refactor, test, perf)

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + Tailwind 4 + Biome + bun

**Typography:** Custom MDX components in `mdx-components.tsx`
- Style MDX elements (h1, p, etc.) with Tailwind classes directly
- No @tailwindcss/typography (incompatible with Tailwind v4)

**Internationalization:** next-intl with locale-based routing
- Locales: `en`, `de` (configured in `i18n/config.ts`)
- Routes use `[locale]` dynamic segment: `app/[locale]/page.tsx`
- Translations: `messages/{locale}.json`
- Middleware handles locale detection and redirects

**Theming:** next-themes with CSS variables
- Theme tokens in `app/globals.css` (light/dark using oklch colors)
- `ThemeProvider` wraps app in locale layout

**UI Components:** shadcn/ui pattern
- Base components in `components/ui/` (e.g., `Button` with CVA variants)
- Utility: `cn()` from `@/lib/utils` for class merging

**Key files:**
- `middleware.ts` — Locale routing middleware
- `app/layout.tsx` — Root layout (imports globals.css)
- `app/[locale]/layout.tsx` — Locale layout (providers, html lang)
- `i18n/request.ts` — next-intl request config

## Planned Features

- Personal blog (MDX)
- Song bingo game (Spotify OAuth)
- Kniffel tracker

## Infrastructure

- Hosting: Hetzner via Docker
- Reverse proxy: Caddy (handles HTTPS)
- Output: standalone (`next.config.ts`)
