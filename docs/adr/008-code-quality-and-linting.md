# ADR-008: Code Quality and Linting

**Status:** Accepted
**Date:** 2026-02-06
**Decision Makers:** Pascal Kraus

## Context

The project needed automated code quality enforcement for consistent formatting, linting, and import organization across TypeScript, CSS, and configuration files. The JavaScript ecosystem traditionally requires multiple tools for this (ESLint for linting, Prettier for formatting, import-sort plugins), each with their own configuration files, plugin ecosystems, and sometimes conflicting rules. A unified, fast solution was needed to avoid configuration sprawl and tooling conflicts.

## Decision

Use **Biome** (^2.3.13) as the single tool for linting, formatting, and import organization — replacing ESLint, Prettier, and any import sorting plugins entirely.

### Configuration — `biome.json`

```json
{
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true           // Respects .gitignore
  },
  "files": {
    "include": ["**"],
    "ignoreUnknown": true           // Silently skip non-supported file types
  },
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",       // Double quotes everywhere
      "semicolons": "always"        // Always use semicolons
    }
  },
  "css": {
    "formatter": {
      "indentWidth": 2
    }
  },
  "linter": {
    "rules": {
      "recommended": true           // All recommended rules, no custom overrides
    }
  },
  "assist": {
    "actions": {
      "source": {
        "organizeImports": {
          "level": "on"             // Auto-sort imports
        }
      }
    }
  },
  "css": {
    "linter": { "enabled": true },
    "parser": {
      "cssModules": "allow",
      "allowSuperAtRuleParams": true  // Support Tailwind directives like @theme
    }
  }
}
```

Key configuration choices:
- **Recommended rules only** — no custom rule overrides, keeping the config minimal and aligned with community standards
- **Git-aware** — uses `.gitignore` to skip `node_modules/`, `.next/`, `bun.lock`, and other generated files
- **CSS support** — lints CSS files with CSS modules and Tailwind directive compatibility
- **Import organization** — automatically sorts and groups imports as a source action

### Excluded Files

Via `.gitignore` integration: `node_modules/`, `.next/`, `bun.lock`

### Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `check` | `biome check .` | Lint + format check (read-only, fails on issues) |
| `fix` | `biome check . --write` | Auto-fix all fixable issues |

The `make check` target chains linting with the production build: `bun run check && bun run build`.

### Enforcement Pipeline

**Local development:**
1. `bun run check` — read-only validation (CI-equivalent)
2. `bun run fix` — auto-fix formatting and import ordering
3. IDE integration — Biome LSP provides real-time feedback

**CI (GitHub Actions):**
1. `bun run check` — lint and format validation
2. `bun run build` — TypeScript type-checking via Next.js production build

TypeScript **strict mode** acts as an additional quality gate — the production build fails on type errors, complementing Biome's JavaScript/TypeScript linting.

### What Biome replaces

| Previous Tool | Biome Equivalent |
|--------------|-----------------|
| ESLint | `linter` section — static analysis rules |
| Prettier | `formatter` section — code formatting |
| eslint-plugin-import / import-sort | `assist.actions.source.organizeImports` |
| .editorconfig | `formatter` section (indent style/width) |

### What Biome does NOT cover

- **TypeScript type checking** — handled by the `tsc` step in `bun run build`
- **Test execution** — handled by Vitest (see ADR-007)
- **Commit hooks** — no pre-commit hooks are configured (no husky, lint-staged)
- **Spell checking** — not configured

## Consequences

### Positive
- Single configuration file (`biome.json`) replaces 2-3 separate config files (`.eslintrc`, `.prettierrc`, `.editorconfig`)
- Extremely fast — Biome processes all 95+ project files in ~23ms, written in Rust
- No plugin compatibility issues — ESLint + Prettier integration is a common source of conflicts that Biome eliminates entirely
- Zero custom rule overrides means the project benefits from community-maintained defaults without config drift
- CSS linting with Tailwind directive support catches CSS issues that ESLint alone would miss
- Import organization is automatic — no manual import sorting or plugin configuration

### Negative
- Biome's rule set is smaller than ESLint's ecosystem — some specialized rules (React hooks exhaustive-deps, accessibility) may not have equivalents
- Less mature ecosystem compared to ESLint — fewer community plugins, less Stack Overflow coverage
- Migrating to or from Biome requires config translation if the tooling choice changes
- No pre-commit hooks means developers can commit code that fails `bun run check` — CI catches it, but the feedback loop is slower

### Neutral
- Biome's formatting opinions (double quotes, always semicolons) match the project's chosen style — these are configuration choices, not constraints
- The `ignoreUnknown: true` setting means Biome silently skips files it doesn't understand rather than erroring, which could mask misconfiguration
- Tests are not included in the CI quality gate (only lint + build) — this is a separate decision documented in ADR-007

## Alternatives Considered

| Alternative | Reason Not Chosen |
|------------|-------------------|
| ESLint + Prettier | Two tools with separate configs, plugin compatibility issues (eslint-config-prettier), slower execution, and more complex setup |
| ESLint flat config (v9+) | Improved ESLint config but still requires Prettier for formatting; doesn't solve the multi-tool problem |
| deno lint | Tied to the Deno ecosystem; less natural integration with Next.js and bun |
| oxlint | Fast Rust-based linter but formatting-only via separate tool (oxc_formatter); less mature than Biome at the time of adoption |
| Rome (Biome's predecessor) | Project was abandoned; Biome is the community fork and active successor |
| No linter (TypeScript only) | TypeScript catches type errors but not style issues, unused variables behind type assertions, import ordering, or formatting consistency |

## References

- `biome.json` — Biome configuration
- `package.json` — Scripts (`check`, `fix`)
- `Makefile` — `make check` target (lint + build)
- `.github/workflows/` — CI configuration running `bun run check` + `bun run build`
