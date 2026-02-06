# ADR-001: Framework and Runtime

**Status:** Accepted
**Date:** 2026-02-06
**Decision Makers:** Pascal Kraus

## Context

This personal website requires server-side rendering for SEO (blog content), rich client-side interactivity (games and tools), and first-class MDX support for content authoring. A modern, full-stack framework was needed that could handle all three concerns in a single codebase with strong TypeScript support and a streamlined developer experience.

## Decision

The project uses the following stack:

- **Next.js ^16.1.6** with the **App Router** (not Pages Router) as the core framework (`next.config.ts:8-14`)
- **React ^19.2.4** / **react-dom ^19.2.4** for the UI layer (`package.json:46-47`)
- **TypeScript ^5.9.3** in strict mode with additional safety flags (`tsconfig.json:16-20`):
  - `strict: true`, `noUncheckedIndexedAccess: true`, `noFallthroughCasesInSwitch: true`, `noImplicitOverride: true`
  - Bundler module resolution (`tsconfig.json:11`)
  - Incremental compilation enabled (`tsconfig.json:26`)
- **bun** as both the package manager and production runtime (`Dockerfile:1` uses `oven/bun:1-alpine`, production runs `bun server.js` at `Dockerfile:44`)
- **Output mode: `standalone`** for self-contained production builds (`next.config.ts:9`)
- **Configuration flags** (`next.config.ts:10-12`):
  - `reactStrictMode: true` for development quality checks
  - `poweredByHeader: false` to remove the `X-Powered-By` header
  - `compress: false` because compression is delegated to the Caddy reverse proxy
- **Page extensions:** `ts`, `tsx`, `mdx` (`next.config.ts:13`)
- **Plugins:** `next-intl/plugin` for internationalization and `@next/mdx` for MDX content (`next.config.ts:1-6, 16`)
- **PostCSS:** `@tailwindcss/postcss` as the sole PostCSS plugin (`postcss.config.mjs:1-7`)
- **Path aliases:** `@/*` maps to `./*` (`tsconfig.json:32-34`)
- **Linting:** Biome ^2.3.13 (`package.json:16`) instead of ESLint/Prettier

### Production Infrastructure

The application is containerized with a multi-stage Docker build (`Dockerfile`):
1. **deps** stage: installs dependencies with `bun install --frozen-lockfile`
2. **builder** stage: runs `bun run build` to produce the standalone output
3. **runner** stage: copies only `.next/standalone` and `.next/static`, runs as non-root `nextjs` user on port 3000

Hosting is on Hetzner with Caddy as the reverse proxy handling HTTPS termination and compression.

## Consequences

### Positive
- App Router provides React Server Components, streaming, and nested layouts out of the box
- `standalone` output produces a self-contained deployment artifact (~50MB vs full node_modules)
- bun provides faster installs, builds, and production startup compared to Node.js
- Strict TypeScript catches entire classes of bugs at compile time (especially `noUncheckedIndexedAccess`)
- MDX is a first-class page extension, enabling rich blog content with embedded components
- Biome replaces both ESLint and Prettier with a single, fast tool

### Negative
- Next.js App Router is a more complex mental model than Pages Router (server vs. client components, async params)
- bun runtime has a smaller ecosystem and fewer production battle-testing reports than Node.js
- `standalone` output requires careful handling of static assets (manual copy in Dockerfile at line 35)
- Cutting-edge versions (Next.js 16, React 19, TS 5.9) may encounter ecosystem compatibility gaps

### Neutral
- Caddy handles compression, so the Next.js compression middleware is explicitly disabled
- The `poweredByHeader: false` flag is a minor security hardening measure
- Incremental TypeScript compilation speeds up development but adds `.tsbuildinfo` files

## Alternatives Considered

| Alternative | Reason Not Chosen |
|------------|-------------------|
| Astro | Previously used; migrated away due to limited client-side interactivity support for games/tools |
| Remix | Fewer MDX integrations, smaller plugin ecosystem at the time of decision |
| SvelteKit | Would require learning Svelte; React ecosystem preferred for component libraries (shadcn/ui, Radix) |
| Vite + React SPA | No SSR for blog SEO; would require separate SSG solution for content |
| Node.js runtime | bun chosen for faster installs and startup; Alpine image keeps container small |
| ESLint + Prettier | Biome provides both linting and formatting in a single tool with better performance |

## References

- `next.config.ts` — Framework configuration (plugins, output mode, flags)
- `tsconfig.json` — TypeScript compiler options
- `package.json` — Dependency versions and scripts
- `postcss.config.mjs` — PostCSS plugin configuration
- `Dockerfile` — Multi-stage production build
- `app/layout.tsx` — Root layout (imports globals.css)
- `app/[locale]/layout.tsx` — Locale layout (providers, html lang)
