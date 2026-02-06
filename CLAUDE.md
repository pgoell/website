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

## ADR-First Development Workflow

All architectural decisions are documented in `docs/adr/`. The ADRs are the source of truth.

**Before implementing any new feature, structural change, or pattern deviation:**

1. **Check ADRs** — Read relevant ADRs in `docs/adr/` to understand existing decisions
2. **Update/Create ADR** — If the change contradicts an existing ADR, update it first (set old to "Superseded"). If the change introduces a new pattern, create a new ADR (status "Proposed")
3. **Update Implementation Plan** — Reflect the change in `docs/IMPLEMENTATION_PLAN.md`
4. **Implement** — Follow the ADR and implementation plan
5. **Verify compliance** — Use the checklist at the bottom of `docs/IMPLEMENTATION_PLAN.md`

**Nothing gets implemented without being documented in an ADR first.**

Key ADR documents:
- `docs/adr/README.md` — Index, governance, known inconsistencies
- `docs/IMPLEMENTATION_PLAN.md` — Phased plan derived from ADRs

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + Tailwind 4 + Biome + bun

**Feature architecture** (ADR-005): Four layers for every interactive feature:
1. `lib/{feature}/` — Pure logic, types, constants (no React)
2. `components/{feature}/use-{feature}.ts` — Custom hook (React bridge)
3. `components/{feature}/*.tsx` — UI components ("use client")
4. `app/[locale]/{category}/{feature}/page.tsx` — Server component route

**Internationalization** (ADR-003): next-intl with locale-based routing
- Locales: `en`, `de` (configured in `i18n/config.ts`)
- Routes use `[locale]` dynamic segment: `app/[locale]/page.tsx`
- Translations: `messages/{locale}.json` — all UI text via `useTranslations()`
- Key naming: camelCase, namespaced by feature

**Styling** (ADR-002): Tailwind 4 CSS-first + next-themes
- Theme tokens in `app/globals.css` (oklch colors, `@theme inline` block)
- No JS config file — pure CSS configuration
- `ThemeProvider` wraps app in locale layout

**UI Components** (ADR-004): shadcn/ui pattern
- Base components in `components/ui/` (Button with CVA variants, DropdownMenu)
- Utility: `cn()` from `@/lib/utils` for class merging

**State management** (ADR-012): useState + useEffect + localStorage
- Per-feature isolation, no global state
- Runtime type guards for storage validation (follow Pomodoro's pattern)

**Testing** (ADR-007): Vitest, pure function tests in `lib/{feature}/__tests__/`

**Key files:**
- `proxy.ts` — Locale routing middleware (Next.js 16 pattern)
- `app/layout.tsx` — Root layout (imports globals.css)
- `app/[locale]/layout.tsx` — Locale layout (providers, html lang)
- `i18n/request.ts` — next-intl request config

## Features

**Implemented:**
- Personal blog (MDX) at `/blog`
- Wordle game at `/games/wordle` (EN/DE word lists, solver, demo)
- Kniffel tracker at `/games/kniffel` (digital + manual modes)
- Pomodoro timer at `/tools/pomodoro` (presets, scheduling, stats)

**Planned** (see `docs/IMPLEMENTATION_PLAN.md`):
- Song bingo game (Spotify OAuth — needs ADR-013)
- Blog enhancements (syntax highlighting, more MDX components)

## Infrastructure

- Hosting: Hetzner via Docker (ADR-009)
- Reverse proxy: Caddy (handles HTTPS + compression)
- Output: standalone (`next.config.ts`)
- CI: GitHub Actions (lint + build on PRs, manual/release deploys)
- VCS: Jujutsu (ADR-010)
