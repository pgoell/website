# Architecture Decision Records (ADRs)

This directory contains all Architecture Decision Records for the personal website project. ADRs document significant architectural choices and serve as the authoritative reference for how the codebase should evolve.

## Governance

**All new features, tools, and structural changes must align with these ADRs.** If a proposed change contradicts an existing ADR, the ADR must be updated first (with a new status like "Superseded by ADR-XXX" or "Amended") before the change is implemented.

### ADR Lifecycle

| Status | Meaning |
|--------|---------|
| **Proposed** | Under discussion, not yet accepted |
| **Accepted** | Active decision that must be followed |
| **Deprecated** | No longer recommended but existing code may still follow it |
| **Superseded** | Replaced by a newer ADR (linked in the document) |

### Adding a New ADR

1. Use the next sequential number: `NNN-short-title.md`
2. Follow the template format (see any existing ADR)
3. Set status to "Proposed" until reviewed
4. Update this README index

## Index

### Foundation

| ADR | Title | Status | Summary |
|-----|-------|--------|---------|
| [001](001-framework-and-runtime.md) | Framework and Runtime | Accepted | Next.js 16 App Router, React 19, TypeScript 5.9 strict, bun runtime, standalone output |
| [002](002-styling-and-theming.md) | Styling and Theming | Accepted | Tailwind CSS 4 (CSS-first), oklch color system, next-themes dark mode, semantic design tokens |
| [003](003-internationalization.md) | Internationalization | Accepted | next-intl 4.8, en/de locales, always-prefixed routing, camelCase translation keys |
| [004](004-ui-component-architecture.md) | UI Component Architecture | Accepted | shadcn/ui owned components, Radix UI primitives, CVA variants, cn() utility |

### Features & Content

| ADR | Title | Status | Summary |
|-----|-------|--------|---------|
| [005](005-interactive-feature-architecture.md) | Interactive Feature Architecture | Accepted | Four-layer pattern: pure logic → React hook → UI components → page route |
| [006](006-content-management.md) | Content Management | Accepted | Local MDX files in content/{locale}/, gray-matter frontmatter, next-mdx-remote SSR |
| [012](012-state-management.md) | State Management | Accepted | useState + useEffect + localStorage, no global state, per-feature isolation |

### Quality & Testing

| ADR | Title | Status | Summary |
|-----|-------|--------|---------|
| [007](007-testing-strategy.md) | Testing Strategy | Accepted | Vitest, pure function unit tests only, lib/__tests__/ organization, ~107 tests |
| [008](008-code-quality-and-linting.md) | Code Quality and Linting | Accepted | Biome (replaces ESLint + Prettier), recommended rules, CI enforcement |

### Infrastructure & Workflow

| ADR | Title | Status | Summary |
|-----|-------|--------|---------|
| [009](009-infrastructure-and-deployment.md) | Infrastructure and Deployment | Accepted | Hetzner, Docker multi-stage build, Caddy reverse proxy, GitHub Actions CI/CD |
| [010](010-version-control.md) | Version Control | Accepted | Jujutsu (jj), Git-compatible, bookmark conventions, conventional commits |
| [011](011-navigation-and-routing.md) | Navigation and Routing | Accepted | [locale]-based routes, sticky header, section index card grids, SiteNav dropdown |

## Known Inconsistencies

All previously documented inconsistencies have been resolved (Phase 1 tech debt):

1. ~~**Wordle i18n**~~ — Migrated to `useTranslations()` and `useLocale()`
2. ~~**Pomodoro structure**~~ — Extracted `usePomodoro()` hook and barrel exports
3. ~~**SiteNav dropdown**~~ — Replaced with Radix `DropdownMenu` primitives
4. ~~**Back navigation**~~ — All pages use `nav.back` translation key
5. ~~**Storage validation**~~ — Wordle and Kniffel now use type guards matching Pomodoro pattern
6. ~~**Unused test dependencies**~~ — Removed `@testing-library/dom`, `@testing-library/react`, `jsdom`
7. ~~**Tests not in CI**~~ — Added `bun run test` step to CI pipeline
