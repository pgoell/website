# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev        # Start dev server
bun run build      # Production build
bun run check      # Run Biome linter
bun run fix        # Auto-fix linting issues
bun run test       # Run tests (vitest)
bun run test:watch # Run tests in watch mode

make check         # Lint + build
make setup         # Initial setup (checks bun/jj)
```

## Version Control: Jujutsu (jj)

This project uses **jj** as the primary VCS (Git-compatible). Changes auto-track—no staging needed.

### Basic Commands

```bash
jj status                              # Check status
jj log                                 # View history
jj new                                 # Start new work
jj describe -m "feat: message"         # Add commit message
jj bookmark create feature/name        # Create branch
jj git push --bookmark feature/name    # Push to GitHub
jj git fetch && jj rebase -d master    # Sync with master
```

### Creating a PR Workflow

**1. Start new work on current change:**
```bash
jj status                              # Check what's in current change
jj describe -m "feat: description"     # Describe your work
jj bookmark create feature/name        # Create feature branch
```

**2. Track and push:**
```bash
jj bookmark track feature/name --remote=origin
jj git push --bookmark feature/name
```

**3. Create PR:**
```bash
gh pr create --head feature/name --base master \
  --title "feat: title" \
  --body "Description"
```

### Modular Change Tracking

**Split changes into separate PRs:**

When you have multiple unrelated changes in one commit (e.g., deployment config + icons), split them:

```bash
# Start from a change with mixed content
jj status                              # View all files

# Create new change
jj new                                 # Creates empty child change

# Move specific files to new change
jj squash --from @- file1.tsx file2.tsx

# Describe and push the new change
jj describe -m "feat: specific feature"
jj bookmark create feature/specific
jj bookmark track feature/specific --remote=origin
jj git push --bookmark feature/specific
```

**Move back to parent change:**
```bash
jj edit @-                             # Edit parent change
jj describe -m "feat: other feature"   # Describe remaining work
jj bookmark create feature/other
```

**Branch naming:** `feature/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`, `perf/`

**Commit format:** `type: description` (feat, fix, chore, docs, refactor, test, perf)

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + Tailwind 4 + Biome + bun

**Feature architecture**: Four layers for every interactive feature:
1. `lib/{feature}/` — Pure logic, types, constants (no React)
2. `components/{feature}/use-{feature}.ts` — Custom hook (React bridge)
3. `components/{feature}/*.tsx` — UI components ("use client")
4. `app/[locale]/{category}/{feature}/page.tsx` — Server component route

**Internationalization**: next-intl with locale-based routing
- Locales: `en`, `de` (configured in `i18n/config.ts`)
- Routes use `[locale]` dynamic segment: `app/[locale]/page.tsx`
- Translations: `messages/{locale}.json` — all UI text via `useTranslations()`
- Key naming: camelCase, namespaced by feature

**Styling**: Tailwind 4 CSS-first + next-themes
- Theme tokens in `app/globals.css` (oklch colors, `@theme inline` block)
- No JS config file — pure CSS configuration
- `ThemeProvider` wraps app in locale layout

**UI Components**: shadcn/ui pattern
- Base components in `components/ui/` (Button with CVA variants, DropdownMenu)
- Utility: `cn()` from `@/lib/utils` for class merging

**State management**: useState + useEffect + localStorage
- Per-feature isolation, no global state
- Runtime type guards for storage validation (follow Pomodoro's pattern)

**Testing**: Vitest, pure function tests in `lib/{feature}/__tests__/`. The trips database tests run against a throwaway Postgres in `TEST_DATABASE_URL` and skip without it (CI has a service container). Locally: `docker run -d --rm --name pg-test -e POSTGRES_PASSWORD=test -p 127.0.0.1:55432:5432 postgres:17.11-alpine3.24`, then `TEST_DATABASE_URL=postgres://postgres:test@127.0.0.1:55432/postgres bun run test`. Never the shared database on the server.

**Key files:**
- `proxy.ts` — Locale routing middleware (Next.js 16 pattern)
- `app/layout.tsx` — Root layout (imports globals.css)
- `app/[locale]/layout.tsx` — Locale layout (providers, html lang)
- `app/[locale]/(site)/layout.tsx` — Camera-style frame for blog, games and tools (`components/site/`)
- `components/frame/` — The shared camera-screen frame (top bar, tabs, focus-frame title) used by the legal and site layouts
- `app/[locale]/(legal)/layout.tsx` — Camera-style frame for Impressum and Datenschutz (`components/legal/`)
- `i18n/request.ts` — next-intl request config

## Features

**Implemented:**
- Viewfinder home page at `/` (canvas rooftop view of Gelnhausen lit by the real sun over the town, four seasons, camera menu, contact and legal links on the image, no second screen; on a phone the scene fills the screen and pans and pinch-zooms by touch; live weather from Open-Meteo; soft lo-fi ambient sound (CC0 recordings in `public/sounds/ambience` plus a Web Audio piano, a music box in snow and a drone and far bell in fog) that follows the weather, off until the visitor turns it on; `?time=HH[:MM]`, `?date=YYYY-MM-DD` (Berlin local), `?weather=clear|cloudy|overcast|rain|snow|fog|storm` and `?state=menu|search|play|music` for review); the Now Playing readout opens the menu's Music tab with Spotify stats (now playing, recent plays and today's total, top artists, tracks and genres over 4 weeks, 6 months or a year)
- Personal blog at `/blog`: MDX posts in `content/` plus notes Pascal marks `publish: true` in Kasten, fetched live from `GET {KASTEN_URL}/agent/posts` with the same reading-only `KASTEN_TOKEN` as the Reading readout (plain markdown, refreshed every ten minutes)
- Trips at `/trips`: the trips, on a night map, day by day, read from the website's own Postgres database (`DATABASE_URL`, schema `trips`, tables in `lib/trips/schema.ts`, migrated on first use). Open trips show to all; private ones to the people in `ALLOWED_EMAILS` after Google sign-in at `/auth/login` (`lib/trips/auth.ts`, session cookie `trips_session`, secrets `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL`). `next dev` without `GOOGLE_CLIENT_ID` is signed in as Dev. Bookings live only in the database, never in this public repo; `lib/trips/__tests__/no-bookings.test.ts` fails on a price or booking number in a trips file. Booking changes: change the vault note, then `docker exec -i website-prod bun scripts/trips/import.ts < trip.json` (JSON kept outside the repo). A trip fills the screen: the map, a strip of its days, and one day at a time in a card, with a Night and Day look the visitor picks. The map is MapLibre with the style in `components/trips/map-style.json` (run `bun scripts/build-day-map-style.ts` for the light one); tiles and fonts come from OpenFreeMap through `/api/map/*`, so a visitor's browser asks pgoell.com only
- Wordle game at `/games/wordle` (EN/DE word lists, solver, demo)
- Kniffel tracker at `/games/kniffel` (digital + manual modes)
- Pomodoro timer at `/tools/pomodoro` (presets, scheduling, stats)

**Planned** (see `docs/IMPLEMENTATION_PLAN.md`):
- Song bingo game (Spotify OAuth)
- Blog enhancements (syntax highlighting, more MDX components)

## Infrastructure

- Hosting: Hetzner via Docker
- Reverse proxy: Caddy (handles HTTPS + compression)
- Output: standalone (`next.config.ts`)
- CI: GitHub Actions (lint + build on PRs, manual/release deploys)
- VCS: Jujutsu
