# Implementation Plan

Derived from the [Architecture Decision Records](adr/README.md) and [PLAN.md](PLAN.md). All work items reference the ADRs they must comply with.

## Phase 1: Resolve Technical Debt

Address the known inconsistencies documented in the ADRs before adding new features. This ensures the codebase is consistent and the ADR patterns are fully reliable as a guide.

### 1.1 Standardize Wordle i18n (ADR-003, ADR-005)

- Migrate all inline `locale === "de"` checks in Wordle components to `useTranslations()`
- Add missing translation keys to `messages/en.json` and `messages/de.json` under the `games.wordle` namespace
- Remove `locale` prop threading where `useTranslations()` replaces it
- **Files:** `components/wordle/wordle-game.tsx`, `components/wordle/wordle-keyboard.tsx`, `messages/*.json`

### 1.2 Standardize Pomodoro structure (ADR-005)

- Extract state management from `pomodoro-app.tsx` into `components/pomodoro/use-pomodoro.ts` hook
- Add barrel exports: `lib/pomodoro/index.ts` and `components/pomodoro/index.ts`
- Align page component to pass `locale` prop like games do (or document the tools pattern as intentionally different)
- **Files:** `components/pomodoro/pomodoro-app.tsx`, new `use-pomodoro.ts`, new `index.ts` files

### 1.3 Standardize SiteNav dropdown (ADR-004, ADR-011)

- Replace custom dropdown in `components/site-nav.tsx` with `components/ui/dropdown-menu.tsx` (Radix-based)
- Maintain existing ARIA attributes and keyboard navigation
- **Files:** `components/site-nav.tsx`

### 1.4 Standardize back navigation (ADR-011)

- Decide on a consistent pattern: either all feature pages have back links or none do
- If back links: use `useTranslations("nav")` instead of hardcoded locale strings
- Apply consistently across `app/[locale]/games/*/page.tsx` and `app/[locale]/tools/*/page.tsx`
- **Files:** All feature page.tsx files

### 1.5 Standardize storage validation (ADR-012)

- Add runtime type guards to Wordle and Kniffel storage (follow Pomodoro's `storage.ts` pattern)
- Extract storage functions from hooks into `lib/wordle/storage.ts` and `lib/kniffel/storage.ts`
- **Files:** `components/wordle/use-wordle.ts`, `components/kniffel/use-kniffel.ts`, new storage modules

### 1.6 Add tests to CI and clean up unused deps (ADR-007, ADR-008)

- Add `bun run test` step to `.github/workflows/ci.yml` after lint and before build
- Evaluate: either write component tests using `@testing-library/react` or remove unused dependencies (`@testing-library/react`, `@testing-library/dom`, `jsdom`)
- If keeping component testing libraries, switch vitest environment to `jsdom` when needed
- **Files:** `.github/workflows/ci.yml`, `package.json`, `vitest.config.ts`

---

## Phase 2: Planned Features

### 2.1 Song Bingo Game (from PLAN.md)

A Spotify-integrated music bingo game. Must follow all ADRs.

**Architecture (per ADR-005):**
- `lib/bingo/types.ts` — `BingoCard`, `BingoCell`, `GameState`, `SpotifyTrack`
- `lib/bingo/game-logic.ts` — Card generation, win detection, shuffle algorithms
- `lib/bingo/spotify.ts` — Spotify Web API client (track search, playback)
- `lib/bingo/__tests__/game-logic.test.ts` — Pure function tests (ADR-007)
- `components/bingo/use-bingo.ts` — Game state hook with localStorage persistence
- `components/bingo/bingo-game.tsx` — Main orchestrator
- `components/bingo/bingo-card.tsx`, `bingo-cell.tsx` — Presentation components
- `components/bingo/index.ts` — Barrel exports
- `app/[locale]/games/bingo/page.tsx` — Server component route

**Authentication (from PLAN.md):**
- Spotify OAuth via Next.js API routes (`app/api/spotify/`)
- Tokens stored in HTTP-only cookies (not localStorage)
- This is a new pattern not covered by existing ADRs — requires **ADR-013: Authentication** before implementation

**i18n (per ADR-003):**
- Add `games.bingo` namespace to `messages/en.json` and `messages/de.json`
- All UI text via `useTranslations("games.bingo")`

**Styling (per ADR-002):**
- Use existing semantic tokens (card, primary, accent)
- Dark mode support via CSS variables

**Testing (per ADR-007):**
- Unit tests for card generation and win detection in `lib/bingo/__tests__/`

**New ADRs needed:**
- ADR-013: Authentication (Spotify OAuth, cookie-based tokens, API routes)

### 2.2 Blog Enhancements (from ADR-006)

The blog is minimal. Planned improvements:

- **Syntax highlighting**: Add rehype-pretty-code or similar remark/rehype plugin
- **MDX components**: Extend `mdx-components.tsx` with styled `h2`, `h3`, `p`, `pre`, `code`, `blockquote`, `ul`, `ol`, `table`, `a`, `img`
- **Blog features**: Reading time estimation, table of contents generation, related posts
- **Content**: Write more posts in both EN and DE

All changes must comply with ADR-002 (Tailwind styling, semantic tokens) and ADR-006 (MDX patterns).

### 2.3 Future Tools

Any new tool must follow the established four-layer architecture (ADR-005):

```
lib/{tool}/
  types.ts
  {logic}.ts
  constants.ts
  storage.ts          # Per ADR-012: runtime type guards, SSR-safe
  index.ts            # Barrel export
  __tests__/{logic}.test.ts  # Per ADR-007

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

### 3.1 PostgreSQL (from PLAN.md, ADR-009)

Add when a feature requires shared/server-side state (e.g., multiplayer bingo, leaderboards):
- Containerized PostgreSQL in the infra repo
- Connection via Docker `web` network
- One instance with multiple databases per app
- Requires new ADR-014: Database Strategy

### 3.2 Remote Dev Environment (from PLAN.md, ADR-009)

- ttyd for web-based terminal access
- Authelia for MFA protection
- Caddy routing: `term.domain.com` → Authelia → ttyd
- Requires new ADR-015: Remote Access

---

## ADR Compliance Checklist

Use this checklist when implementing any new feature:

- [ ] **ADR-001**: Uses Next.js App Router patterns (server components for pages, "use client" for interactivity)
- [ ] **ADR-002**: Uses semantic color tokens from globals.css, supports dark mode, no hardcoded colors
- [ ] **ADR-003**: All user-facing text in `messages/*.json`, uses `useTranslations()`, both EN and DE provided
- [ ] **ADR-004**: Uses `components/ui/` primitives (Button, DropdownMenu), follows shadcn/ui patterns
- [ ] **ADR-005**: Follows four-layer architecture (lib/ → hook → components → page)
- [ ] **ADR-007**: Pure logic functions have unit tests in `lib/{feature}/__tests__/`
- [ ] **ADR-008**: Passes `bun run check` (Biome lint) and `bun run build` (TypeScript)
- [ ] **ADR-010**: Uses conventional commit format, jj workflow
- [ ] **ADR-011**: Section index page updated with new feature card, consistent navigation
- [ ] **ADR-012**: localStorage persistence with runtime type guards, SSR-safe, try/catch error handling
