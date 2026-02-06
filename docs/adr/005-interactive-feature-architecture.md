# ADR-005: Interactive Feature Architecture

**Status:** Accepted
**Date:** 2026-02-06
**Decision Makers:** Pascal Kraus

## Context

The website hosts multiple interactive features — games (Wordle, Kniffel) and tools (Pomodoro timer) — each with substantial client-side logic, state management, persistence, and internationalization requirements. Without a consistent architecture, each feature would evolve independently, making the codebase harder to navigate, test, and extend. A shared structural pattern was needed to guide how interactive features are organized while keeping game/tool logic decoupled from React and the Next.js framework.

## Decision

All interactive features follow a **four-layer architecture** that separates pure logic from React state from UI rendering from routing:

### Layer 1: Pure Logic — `lib/{feature}/`

Framework-agnostic TypeScript modules containing types, constants, and pure functions:

- `types.ts` — TypeScript interfaces, union types, and type constants
- Domain logic modules — pure functions with no React imports (e.g., `lib/wordle/game-logic.ts`, `lib/kniffel/scoring.ts`, `lib/pomodoro/scheduler.ts`)
- Data modules — constants, word lists, configuration values (e.g., `lib/pomodoro/constants.ts`, `lib/wordle/words-{locale}.ts`)
- Barrel exports via `index.ts` for public API surface

### Layer 2: React Bridge — `components/{feature}/use-{feature}.ts`

A single custom hook per feature that bridges pure logic with React state:

- Manages `useState`, `useEffect`, `useCallback`, `useMemo`
- Handles localStorage persistence internally (lazy initialization, auto-save via `useEffect`)
- Returns a state object and action handlers to the UI layer
- Examples: `components/wordle/use-wordle.ts`, `components/kniffel/use-kniffel.ts`

### Layer 3: UI Components — `components/{feature}/*.tsx`

React components for rendering and interaction:

- One main orchestrator component per feature (e.g., `components/wordle/wordle-game.tsx`, `components/pomodoro/pomodoro-app.tsx`)
- Leaf presentation components for sub-sections (e.g., `components/pomodoro/stats-panel.tsx`, `components/pomodoro/sources-section.tsx`)
- `"use client"` directive on all interactive components
- Barrel exports via `index.ts` for clean imports from pages

### Layer 4: Page Route — `app/[locale]/{category}/{feature}/page.tsx`

Thin async server component that serves as the Next.js route entry point:

- Calls `getTranslations()` for server-side i18n setup
- Passes `locale` prop down to client components
- Handles metadata generation (`generateMetadata`)

### Current implementation status

| Aspect | Wordle | Kniffel | Pomodoro |
|--------|--------|---------|----------|
| `lib/` barrel export | Yes (`lib/wordle/index.ts`) | Yes (`lib/kniffel/index.ts`) | No |
| `components/` barrel export | Yes | Yes | No |
| Custom hook | `use-wordle.ts` | `use-kniffel.ts` | None (state inline in `pomodoro-app.tsx`) |
| i18n approach | Inline locale checks | Inline locale checks | `useTranslations()` hook |
| Storage location | In hook file | In hook file | Separate `lib/pomodoro/storage.ts` |
| Storage validation | Minimal (type cast) | Minimal (type cast) | Runtime type guards |
| Sub-modules | `lib/wordle/solver/` | None | None |

The Pomodoro timer deviates from the pattern in several ways (no barrel exports, no custom hook, separate storage module). These represent an evolution of the pattern — Pomodoro's storage validation via runtime type guards is more robust than the earlier features' approach, while its lack of a dedicated hook is a structural gap that could be addressed in future refactoring.

### Common patterns across all features

- **SSR guards**: `typeof window !== "undefined"` checks before accessing browser APIs
- **Lazy `useState` from localStorage**: `useState(() => { /* read storage */ })` for hydration-safe initialization
- **Auto-save via `useEffect`**: persist state changes to localStorage on every update
- **Immutable state updates**: spread operators and `map`/`filter` for state transitions
- **Constants extraction**: magic numbers and configuration values in dedicated constants files
- **Pure function testing**: all testable logic lives in Layer 1, tested without mocks

## Consequences

### Positive
- Pure logic in `lib/` is fully testable without React testing infrastructure — all ~107 tests run against pure functions
- Features can be developed in parallel since each has an isolated directory structure
- New developers can understand the pattern from any one feature and apply it to others
- Layer 1 code could theoretically be reused outside React (CLI tools, other frameworks)
- SSR compatibility is straightforward since server components never import client hooks

### Negative
- Some duplication of boilerplate across features (barrel exports, hook structure, page setup)
- No shared abstractions for common patterns like localStorage persistence or game state machines
- The Pomodoro timer's structural deviations create inconsistency until addressed
- Each new feature requires creating files across 4 directories (`lib/`, `components/`, `app/`, `messages/`)

### Neutral
- The pattern emerged organically across three features rather than being designed upfront — each new feature refined it
- No code generation or scaffolding tool exists for creating new features from this template
- Feature-specific i18n approaches vary (inline locale checks vs. `useTranslations()`) reflecting different development timelines

## Alternatives Considered

| Alternative | Reason Not Chosen |
|------------|-------------------|
| Single-file components (all logic + UI in one file) | Prevents unit testing pure logic, creates large files, couples framework to domain logic |
| Global state management (Redux, Zustand) | Overkill for independent features with no shared state; adds bundle size and conceptual overhead |
| Server-side state (database-backed) | Features are client-only interactive tools; server state adds latency, complexity, and hosting requirements for no benefit |
| Shared base hook / abstract game class | Premature abstraction — the three features have different enough state shapes that a generic abstraction would be leaky |
| Feature-sliced design (FSD) | Over-structured for a personal site with 3 features; the simpler lib/components/app split provides sufficient separation |

## References

- `lib/wordle/` — Wordle pure logic (game-logic.ts, types.ts, solver/)
- `lib/kniffel/` — Kniffel pure logic (scoring.ts, types.ts)
- `lib/pomodoro/` — Pomodoro pure logic (scheduler.ts, constants.ts, storage.ts, notifications.ts, types.ts)
- `components/wordle/use-wordle.ts` — Wordle React bridge hook
- `components/kniffel/use-kniffel.ts` — Kniffel React bridge hook
- `components/pomodoro/pomodoro-app.tsx` — Pomodoro main component (hook logic inline)
- `app/[locale]/games/wordle/page.tsx` — Wordle route
- `app/[locale]/games/kniffel/page.tsx` — Kniffel route
- `app/[locale]/tools/pomodoro/page.tsx` — Pomodoro route
