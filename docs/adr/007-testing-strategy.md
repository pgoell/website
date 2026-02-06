# ADR-007: Testing Strategy

**Status:** Accepted
**Date:** 2026-02-06
**Decision Makers:** Pascal Kraus

## Context

The website contains interactive features (Wordle, Kniffel, Pomodoro) with non-trivial pure logic — game rules, scoring algorithms, scheduling calculations, and solver heuristics. This logic needs automated testing to catch regressions, but the project is a personal site where heavy test infrastructure (browser automation, component rendering, visual regression) would add disproportionate maintenance overhead. A testing strategy was needed that provides high confidence in correctness for the logic that matters most, without slowing down development.

## Decision

Adopt a **pure-function unit testing** strategy using Vitest, testing only the framework-agnostic logic layer (`lib/`) with no mocking, no DOM rendering, and no component tests.

### Framework and Configuration

**Vitest** (^4.0.18) is the test runner, configured in `vitest.config.ts`:

```typescript
{
  test: {
    environment: "node",              // No jsdom — tests run in Node.js
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next"]
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) }  // Matches tsconfig paths
  }
}
```

Key configuration choices:
- **Node environment** — no browser simulation needed since all tested code is pure TypeScript
- **Path alias** — `@/` resolves to project root, matching the app's `tsconfig.json` paths
- **No coverage threshold** — coverage is not configured or enforced

### Test Organization

Tests live alongside the code they test using the `__tests__` directory convention:

```
lib/
  wordle/
    __tests__/
      game-logic.test.ts     # ~16 tests, 160 lines
    solver/
      __tests__/
        solver.test.ts       # ~18 tests, 227 lines
  kniffel/
    __tests__/
      scoring.test.ts        # ~32 tests, 442 lines
  pomodoro/
    __tests__/
      scheduler.test.ts      # ~41 tests, 430 lines
```

Total: **4 test files, ~107 tests** covering all three features' core logic.

### Test Style

All tests follow consistent patterns:

- **Explicit imports**: `import { describe, expect, it } from "vitest"` — no globals
- **Describe/it blocks**: grouped by function or behavior area
- **No mocking**: zero usage of `vi.mock()`, `vi.fn()`, or `vi.spyOn()` — all inputs are constructed directly
- **Local helper functions**: test-specific factories like `createDice()`, `createPlayer()`, `makeDate()` for readable test setup
- **No data-driven tests**: `it.each()` is not used; each test case is explicit
- **Assertions**: `toBe`, `toEqual`, `toBeGreaterThan`, `toBeCloseTo`, `toHaveLength`, `toContain`, `not.toBeNull`, `toThrow`

### What is tested

| Feature | Module | What's Tested |
|---------|--------|---------------|
| Wordle | `game-logic.ts` | Letter evaluation, game state transitions, win/loss detection |
| Wordle | `solver/` | Word filtering, hint generation, candidate scoring |
| Kniffel | `scoring.ts` | All 13 Yahtzee category calculations, bonus logic, upper section scoring |
| Pomodoro | `scheduler.ts` | Schedule generation, break ratios, fatigue algorithm, time-based scheduling, preset suggestions |

### What is NOT tested

- **React components** — no component rendering tests despite `@testing-library/react` and `jsdom` being installed as dependencies
- **Hooks** — custom hooks (`use-wordle.ts`, `use-kniffel.ts`) are not tested
- **Integration** — no tests for page rendering, routing, or i18n
- **E2E** — no browser automation (Playwright, Cypress)
- **Visual** — no screenshot comparison or Storybook
- **API** — no route handler tests (none exist currently)

### CI Integration

Tests are **not run in CI**. The CI pipeline (`bun run check` + `bun run build`) enforces linting and type-checking only. Tests are run locally by developers via:

```bash
bun run test        # Single run (vitest run)
bun run test:watch  # Watch mode (vitest)
```

### Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `test` | `vitest run` | Run all tests once |
| `test:watch` | `vitest` | Run in watch mode for development |

## Consequences

### Positive
- Tests are extremely fast — Node.js environment with pure functions, no DOM overhead, completing in under a second
- Zero mocking means tests verify real behavior, not mock configurations
- The pure logic separation (ADR-005) makes testing natural — functions take inputs and return outputs
- Low maintenance burden — no flaky browser tests, no snapshot updates, no mock version drift
- Adding tests for new features follows an obvious pattern: create `lib/{feature}/__tests__/{module}.test.ts`

### Negative
- No coverage of React component behavior — UI bugs (wrong props, broken event handlers, rendering issues) are only caught manually
- Custom hooks contain significant logic (localStorage persistence, state coordination) that has no automated verification
- Tests not running in CI means regressions can be merged if a developer forgets to run tests locally
- `@testing-library/react` and `jsdom` are installed but unused, adding unnecessary dependencies
- No integration testing means cross-layer issues (e.g., wrong prop types between components) rely solely on TypeScript

### Neutral
- The testing strategy aligns with the project's scope as a personal site — comprehensive testing would be warranted for a team or production SaaS product
- Test count (~107) is substantial for the amount of logic, suggesting good coverage of the pure layer
- The absence of `it.each` data-driven tests is a style choice — it makes tests more verbose but also more readable

## Alternatives Considered

| Alternative | Reason Not Chosen |
|------------|-------------------|
| Jest | Vitest is faster, has native ESM support, compatible config with Vite/Next.js, and the team is already using it |
| React Testing Library component tests | Adds DOM simulation overhead (`jsdom`), requires maintaining component test fixtures, and the pure logic layer captures the most important behavior |
| Playwright or Cypress E2E | Heavy infrastructure for a personal site; browser tests are slow, flaky, and require maintenance as UI changes |
| Storybook visual regression | Significant setup overhead (Storybook config, screenshot infrastructure); overkill for the current number of components |
| No tests at all | Game logic and scheduling algorithms have enough complexity that manual testing alone would miss edge cases |
| Test coverage enforcement | Adds friction without proportional benefit for a personal project; the focus is on testing important logic, not hitting arbitrary coverage numbers |

## References

- `vitest.config.ts` — Test runner configuration
- `lib/wordle/__tests__/game-logic.test.ts` — Wordle game logic tests
- `lib/wordle/solver/__tests__/solver.test.ts` — Wordle solver tests
- `lib/kniffel/__tests__/scoring.test.ts` — Kniffel scoring tests
- `lib/pomodoro/__tests__/scheduler.test.ts` — Pomodoro scheduler tests
- `package.json` — Test scripts (`test`, `test:watch`)
