# ADR-012: State Management

**Status:** Accepted
**Date:** 2026-02-06
**Decision Makers:** Pascal Kraus

## Context

The website's interactive features — Wordle, Kniffel, and Pomodoro timer — all require client-side state management for game/tool state and persistence across page reloads. Since these features are purely client-side with no server-side data requirements, a lightweight approach was needed that avoids unnecessary complexity while providing reliable state persistence. Each feature is independent with no shared state between them.

## Decision

### Core Pattern: `useState` + `useEffect` Persistence

All features use the same fundamental pattern for state management:

1. **Lazy initialization from localStorage**: `useState(() => loadFromStorage())`
2. **Auto-save via `useEffect`**: persist state changes to localStorage on every relevant state update
3. **Clear on reset**: dedicated `clearStorage()` functions for starting fresh

There is **no global state management** — no React Context, no Zustand, no Redux. Each feature is fully self-contained with its own state, persistence, and lifecycle logic.

### Storage Details by Feature

| Aspect | Wordle | Kniffel | Pomodoro |
|--------|--------|---------|----------|
| Storage module | Inline in `components/wordle/use-wordle.ts` | Inline in `components/kniffel/use-kniffel.ts` | Separate `lib/pomodoro/storage.ts` |
| Storage key(s) | `wordle-state-{locale}` | `kniffel-state` | `pomodoro:timer`, `pomodoro:stats` |
| Validation | Minimal (`JSON.parse` + type cast) | Minimal (`JSON.parse` + type cast) | Runtime type guards |
| Staleness handling | Locale mismatch detection | Game phase check | Day-based (`isSameDay` comparison) |
| SSR guard | `typeof window === "undefined"` | `typeof window === "undefined"` | Not explicit in storage module |
| Error handling | `try/catch` → return `null` | `try/catch` → return `null` | `try/catch` → return `null` |
| Stored shape | `StoredGameState` (subset of full state) | `StoredGameState` (full state minus computed values) | `StoredTimerData` + `SessionRecord[]` |

### Wordle State (`components/wordle/use-wordle.ts`)

Stores a subset of game state keyed by locale (`wordle-state-en`, `wordle-state-de`). On load, validates that the stored locale matches the current locale; mismatches trigger a fresh game. State includes guesses, current input, game status, and the target word.

### Kniffel State (`components/kniffel/use-kniffel.ts`)

Stores the full game state minus computed values (score totals). On load, checks the game phase to determine if the stored state is still valid. A single `kniffel-state` key is used since the game is not locale-dependent.

### Pomodoro State (`lib/pomodoro/storage.ts`)

The most mature implementation with a dedicated storage module. Key differences from earlier features:

- **Runtime type guards**: `isValidPresetId()`, `isValidPhase()`, `isValidPresetConfig()`, `isValidStoredTimer()`, `isValidSessionRecord()` — each validates structure and value ranges before accepting stored data
- **Two separate stores**: timer state (`pomodoro:timer`) and session statistics (`pomodoro:stats`)
- **Stats management**: `upsertTodayStats()` function for updating daily statistics with `MAX_STATS_DAYS = 90` day retention policy
- **Time drift compensation**: on restore, adjusts timer state to account for elapsed time while the page was closed

### Serialization

All features use `JSON.stringify` / `JSON.parse` for serialization:
- Dates are stored as ISO strings or `YYYY-MM-DD` format strings
- No `Map` or `Set` types are persisted (these don't survive JSON round-tripping)
- Stored objects are flat or shallowly nested

### Additional React Patterns

- **`setInterval`** for timer-based features (Pomodoro countdown)
- **`useRef`** for values that shouldn't trigger re-renders (interval IDs, previous values)
- **`useMemo`** for expensive derived computations (score calculations, schedule generation)
- **`useCallback`** for stable function references passed to child components

### No Shared Abstractions

Each feature independently implements its own load/save/clear/SSR-guard patterns. There is no shared `useLocalStorage` hook or persistence utility. This means some boilerplate duplication exists across features, but each feature's storage logic can evolve independently (as evidenced by Pomodoro's more robust validation compared to earlier features).

## Consequences

### Positive
- Zero additional dependencies — `useState` and `useEffect` are built into React
- Each feature is fully self-contained and can be understood, tested, or removed independently
- localStorage provides instant reads with no network latency, appropriate for single-user interactive tools
- The Pomodoro storage module demonstrates a mature validation pattern that could guide future features
- No global state means no risk of cross-feature state corruption or unintended coupling
- Lazy `useState` initialization ensures hydration-safe loading without layout shifts

### Negative
- Boilerplate duplication across features (SSR guards, try/catch, JSON parse/serialize)
- No shared `useLocalStorage` abstraction despite repeating the same pattern three times
- Earlier features (Wordle, Kniffel) have minimal validation — corrupted localStorage could cause runtime errors
- localStorage has a ~5MB limit per origin, which is sufficient now but could become a constraint
- No data migration strategy — changing the stored shape requires handling old formats or clearing state
- SSR guard inconsistency (Pomodoro storage module lacks explicit `typeof window` check)

### Neutral
- localStorage data is per-browser and per-device — no cross-device sync
- Clearing browser data resets all game progress, which is acceptable for casual games/tools
- The evolution from minimal validation (Wordle) to runtime type guards (Pomodoro) reflects natural codebase maturation
- No server-side persistence means no user accounts or authentication are needed

## Alternatives Considered

| Alternative | Reason Not Chosen |
|------------|-------------------|
| Zustand | Adds a dependency for state that doesn't need to be shared across components; localStorage persistence plugin exists but is unnecessary given the simple patterns used |
| Jotai | Atomic state model is elegant but overkill for features that manage state in a single hook |
| React Context | Appropriate for shared state but each feature's state is consumed by a single component tree — prop drilling or hook returns are simpler |
| IndexedDB | Async API adds complexity; localStorage's synchronous reads are simpler for small payloads; no need for structured queries or large data storage |
| Server-side persistence (database) | Features are client-only interactive tools; server state adds latency, requires authentication, and needs hosting infrastructure for no meaningful benefit |
| Shared `useLocalStorage` hook | Reasonable abstraction that could reduce duplication, but premature given that each feature's storage needs differ (validation depth, key structure, staleness logic) |

## References

- `components/wordle/use-wordle.ts` — Wordle state management and localStorage persistence
- `components/kniffel/use-kniffel.ts` — Kniffel state management and localStorage persistence
- `lib/pomodoro/storage.ts` — Pomodoro storage module with runtime type guards and stats management
- `lib/pomodoro/types.ts` — Type definitions for `StoredTimerData`, `SessionRecord`, `PresetId`
- `components/pomodoro/pomodoro-app.tsx` — Pomodoro state management (inline, no dedicated hook)
