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

**Testing**: Vitest, pure function tests in `lib/{feature}/__tests__/`

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
- Viewfinder home page at `/` (canvas rooftop view of Gelnhausen lit by the real sun over the town, four seasons, camera menu, contact and legal links on the image, no second screen; on a phone the scene fills the screen and pans and pinch-zooms by touch; live weather from Open-Meteo; soft lo-fi ambient sound (CC0 recordings in `public/sounds/ambience` plus a Web Audio piano, a music box in snow and a drone and far bell in fog) that follows the weather, off until the visitor turns it on; `?time=HH[:MM]`, `?date=YYYY-MM-DD` (Berlin local), `?weather=clear|cloudy|overcast|rain|snow|fog|storm` and `?state=menu|search|play` for review)
- Personal blog at `/blog`: MDX posts in `content/` plus notes Pascal marks `publish: true` in Kasten, fetched live from `GET {KASTEN_URL}/agent/posts` with the same reading-only `KASTEN_TOKEN` as the Reading readout (plain markdown, refreshed every ten minutes)
- Trips at `/trips`: the open trips of the trips app (private repo `pgoell/trips`, trips.pgoell.com) on a night map, day by day. Read live from `GET {TRIPS_URL}/api/trips` and `/api/trips/{slug}` (default `https://trips.pgoell.com`, refreshed every ten minutes). The map is MapLibre with the style in `components/trips/map-style.json` (built in the trips repo, copy it over when it changes); tiles and fonts come from OpenFreeMap through `/api/map/*`, so a visitor's browser asks pgoell.com only
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
