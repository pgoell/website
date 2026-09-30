# Implementation Plan

Derived from [PLAN.md](PLAN.md).

## Phase 1: Resolve Technical Debt

Fix known inconsistencies before adding new features, so the codebase stays consistent and its patterns work as a guide.

### 1.1 Standardize Wordle i18n

- Migrate all inline `locale === "de"` checks in Wordle components to `useTranslations()`
- Add missing translation keys to `messages/en.json` and `messages/de.json` under the `games.wordle` namespace
- Remove `locale` prop threading where `useTranslations()` replaces it
- **Files:** `components/wordle/wordle-game.tsx`, `components/wordle/wordle-keyboard.tsx`, `messages/*.json`

### 1.2 Standardize Pomodoro structure

- Extract state management from `pomodoro-app.tsx` into `components/pomodoro/use-pomodoro.ts` hook
- Add barrel exports: `lib/pomodoro/index.ts` and `components/pomodoro/index.ts`
- Align page component to pass `locale` prop like games do (or document the tools pattern as intentionally different)
- **Files:** `components/pomodoro/pomodoro-app.tsx`, new `use-pomodoro.ts`, new `index.ts` files

### 1.3 Standardize SiteNav dropdown

- Replace custom dropdown in `components/site-nav.tsx` with `components/ui/dropdown-menu.tsx` (Radix-based)
- Maintain existing ARIA attributes and keyboard navigation
- **Files:** `components/site-nav.tsx`

### 1.4 Standardize back navigation

- Decide on a consistent pattern: either all feature pages have back links or none do
- If back links: use `useTranslations("nav")` instead of hardcoded locale strings
- Apply consistently across `app/[locale]/games/*/page.tsx` and `app/[locale]/tools/*/page.tsx`
- **Files:** All feature page.tsx files

### 1.5 Standardize storage validation

- Add runtime type guards to Wordle and Kniffel storage (follow Pomodoro's `storage.ts` pattern)
- Extract storage functions from hooks into `lib/wordle/storage.ts` and `lib/kniffel/storage.ts`
- **Files:** `components/wordle/use-wordle.ts`, `components/kniffel/use-kniffel.ts`, new storage modules

### 1.6 Add tests to CI and clean up unused deps

- Add `bun run test` step to `.github/workflows/ci.yml` after lint and before build
- Evaluate: either write component tests using `@testing-library/react` or remove unused dependencies (`@testing-library/react`, `@testing-library/dom`, `jsdom`)
- If keeping component testing libraries, switch vitest environment to `jsdom` when needed
- **Files:** `.github/workflows/ci.yml`, `package.json`, `vitest.config.ts`

---

## Phase 2: Planned Features

### 2.1 Song Bingo Game (from PLAN.md)

A Spotify-integrated music bingo game.

**Architecture:**
- `lib/bingo/types.ts` — `BingoCard`, `BingoCell`, `GameState`, `SpotifyTrack`
- `lib/bingo/game-logic.ts` — Card generation, win detection, shuffle algorithms
- `lib/bingo/spotify.ts` — Spotify Web API client (track search, playback)
- `lib/bingo/__tests__/game-logic.test.ts` — Pure function tests
- `components/bingo/use-bingo.ts` — Game state hook with localStorage persistence
- `components/bingo/bingo-game.tsx` — Main orchestrator
- `components/bingo/bingo-card.tsx`, `bingo-cell.tsx` — Presentation components
- `components/bingo/index.ts` — Barrel exports
- `app/[locale]/games/bingo/page.tsx` — Server component route

**Authentication (from PLAN.md):**
- Spotify OAuth via Next.js API routes (`app/api/spotify/`)
- Tokens stored in HTTP-only cookies (not localStorage)
- This is a new pattern (authentication) not used elsewhere in the codebase

**i18n:**
- Add `games.bingo` namespace to `messages/en.json` and `messages/de.json`
- All UI text via `useTranslations("games.bingo")`

**Styling:**
- Use existing semantic tokens (card, primary, accent)
- Dark mode support via CSS variables

**Testing:**
- Unit tests for card generation and win detection in `lib/bingo/__tests__/`

### 2.2 Blog Enhancements

The blog is minimal. Planned improvements:

- **Syntax highlighting**: Add rehype-pretty-code or similar remark/rehype plugin
- **MDX components**: Extend `mdx-components.tsx` with styled `h2`, `h3`, `p`, `pre`, `code`, `blockquote`, `ul`, `ol`, `table`, `a`, `img`
- **Blog features**: Reading time estimation, table of contents generation, related posts
- **Content**: Write more posts in both EN and DE

All changes use Tailwind semantic tokens and the existing MDX patterns.

### 2.3 Future Tools

Any new tool must follow the established four-layer architecture:

```
lib/{tool}/
  types.ts
  {logic}.ts
  constants.ts
  storage.ts          # runtime type guards, SSR-safe
  index.ts            # Barrel export
  __tests__/{logic}.test.ts

components/{tool}/
  use-{tool}.ts       # Custom hook
  {tool}-app.tsx      # Main orchestrator
  {sub-components}.tsx
  index.ts            # Barrel export

app/[locale]/tools/{tool}/
  page.tsx            # Server component

messages/en.json      # Add {tool} namespace
messages/de.json      # Add {tool} namespace (parity required)
```

---

## Phase 3: Infrastructure

### 3.1 PostgreSQL (from PLAN.md)

Add when a feature requires shared/server-side state (e.g., multiplayer bingo, leaderboards):
- Containerized PostgreSQL in the infra repo
- Connection via Docker `web` network
- One instance with multiple databases per app

### 3.2 Remote Dev Environment (from PLAN.md)

- ttyd for web-based terminal access
- Authelia for MFA protection
- Caddy routing: `term.domain.com` → Authelia → ttyd
