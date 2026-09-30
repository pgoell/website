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
- `app/[locale]/(site)/layout.tsx` — Header and page frame for every route except the full-bleed home
- `i18n/request.ts` — next-intl request config

## Features

**Implemented:**
- Viewfinder home page at `/` (canvas Gelnhausen scene lit by Europe/Berlin time, camera menu, work map; `?time=HH` and `?state=menu|search|map|play` for review)
- Personal blog (MDX) at `/blog`
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
