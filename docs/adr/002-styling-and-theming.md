# ADR-002: Styling and Theming

**Status:** Accepted
**Date:** 2026-02-06
**Decision Makers:** Pascal Kraus

## Context

The website needs a comprehensive styling system that supports light and dark themes, semantic design tokens, responsive design, and custom typography. The system must integrate cleanly with React Server Components and the shadcn/ui component pattern, while expressing a single cohesive visual character across both themes.

The site's character is **brutalist mono**: pure white / near-black surfaces, JetBrains Mono across all font roles, sharp 0-radius corners, hard offset shadows, heavy 2px borders, tight density, teal accent. Both themes share the same character; only luminance flips.

## Decision

### Tailwind CSS 4 (CSS-First Configuration)

The project uses **Tailwind CSS ^4.1.18** with the new CSS-first configuration model (`app/globals.css:1`). There is no `tailwind.config.ts` file. All theme customization happens in CSS via `@theme inline { }` blocks.

- **Entry point:** `@import "tailwindcss"` (`globals.css:1`)
- **PostCSS integration:** `@tailwindcss/postcss` as the sole plugin (`postcss.config.mjs:3`)
- **Theme registration:** `@theme inline { }` block at `globals.css:130-188` bridges CSS custom properties to Tailwind utility classes (e.g., `--color-primary: var(--primary)` enables `bg-primary`, `text-primary`, etc.)

### Color System: oklch

All color tokens use the **oklch** color space for perceptual uniformity. Colors are defined as CSS custom properties in `:root` (light) and `.dark` (dark) scopes:

- **Light theme:** Pure white background (`oklch(1 0 0)`), near-black foreground (`oklch(0.18 0 0)`), teal primary (`oklch(0.6 0.15 175)`)
- **Dark theme:** Near-black background (`oklch(0.16 0 0)`), near-white foreground (`oklch(0.96 0 0)`), brightened teal primary (`oklch(0.72 0.15 175)`)
- **Border tokens** are set to the full foreground color (not a muted tint) — borders are part of the visual statement, not background separators
- **Semantic tokens:** `background`, `foreground`, `primary`, `secondary`, `accent`, `destructive`, `muted`, `card`, `popover`, `border`, `input`, `ring`, `chart-1` through `chart-5`, `sidebar-*`, `wordle-correct`, `wordle-present`

### Theme Switching: next-themes

- **Library:** `next-themes ^0.4.6` (`package.json:44`)
- **Strategy:** `attribute="class"` — adds `"dark"` class to `<html>` element
- **Defaults:** `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`
- **Provider:** `ThemeProvider` wraps the app inside `NextIntlClientProvider` (`app/[locale]/layout.tsx:27`)
- **Toggle:** Client component with hydration-safe mounting using `useEffect` to avoid SSR mismatch, renders Sun/Moon icons from `lucide-react`

### Typography

All three font families resolve to **JetBrains Mono** with `ui-monospace` and system-mono fallbacks. The brutalist character requires consistent monospace across body, headings, and code.

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `--font-sans` | JetBrains Mono, ui-monospace, … | JetBrains Mono, ui-monospace, … |
| `--font-serif` | JetBrains Mono, ui-monospace, … | JetBrains Mono, ui-monospace, … |
| `--font-mono` | JetBrains Mono, ui-monospace, … | JetBrains Mono, ui-monospace, … |

The body element defaults to `font-size: 15px` and `font-weight: 500` — slightly denser than browser defaults to support the tight-density character.

### Shadow System

Shadows are **hard offset** (no blur, no opacity, in the foreground color) across all sizes. This makes shadows read as a graphic, intentional element rather than ambient depth:

- **Light:** `Npx Npx 0 0 oklch(0.18 0 0)` where N grows with size (2 → 10)
- **Dark:** Same shape, foreground color flipped to `oklch(0.96 0 0)`

### Layout Tokens

- **Spacing base:** `--spacing: 0.213rem` (~85% of the comfortable default — tightens every Tailwind spacing utility proportionally)
- **Border radius:** `--radius: 0rem` — sharp corners everywhere; computed variants in `@theme inline` resolve to 0 / 0 / 0 / 4px
- **Letter spacing:** `--tracking-normal: 0em` — no tracking, native mono metrics
- **Default border width:** A `@layer utilities` override raises Tailwind's `.border` and side-specific border classes from 1px to 2px, so any element opting into a border gets the heavy brutalist weight without per-component edits

### Custom Animations

Only one custom animation exists: `shake` for Wordle invalid guess feedback (`globals.css:197-214`).

## Consequences

### Positive
- CSS-first Tailwind 4 config eliminates the JS config file and keeps all design tokens in one CSS file
- oklch provides perceptually uniform color spacing — adjusting lightness/chroma is predictable
- Semantic tokens (`primary`, `secondary`, etc.) decouple component styles from specific color values
- `@theme inline` block makes all CSS variables available as Tailwind utilities (`bg-primary`, `text-muted-foreground`, etc.)
- A single shared character across both themes keeps the brand consistent — light and dark are luminance flips of the same design language
- `disableTransitionOnChange` prevents flash-of-wrong-theme during switches

### Negative
- oklch has limited browser DevTools support for visual color picking
- The `@theme inline` bridge layer adds ~60 lines of boilerplate to map CSS vars to Tailwind tokens
- All-monospace typography is a strong opinion — readers expecting a softer body font will notice
- The default border width override means any future `border` class change ripples across the app; explicit `border-0` is required to opt out
- No `@tailwindcss/typography` plugin (incompatible with Tailwind v4), so MDX prose styles must be manually applied

### Neutral
- Shadow definitions are verbose but provide complete control over per-theme shadow aesthetics
- The `shake` animation is the only custom keyframe, keeping the animation surface area minimal
- `suppressHydrationWarning` on `<html>` is required by next-themes to avoid SSR/client class mismatch

## Alternatives Considered

| Alternative | Reason Not Chosen |
|------------|-------------------|
| Tailwind v3 (JS config) | v4's CSS-first approach is cleaner and eliminates a config file |
| CSS Modules | Less ergonomic for utility-first workflows; harder to share design tokens |
| Styled Components | Runtime CSS-in-JS conflicts with React Server Components |
| Vanilla CSS | No utility classes; slower iteration for responsive and state-based styling |
| HSL color system | oklch is perceptually uniform; HSL has uneven perceived brightness across hues |
| `@tailwindcss/typography` | Incompatible with Tailwind v4; MDX components styled directly instead |

## References

- `app/globals.css` — All theme tokens, color system, shadows, typography, and animations
- `app/globals.css:1` — Tailwind 4 CSS import entry point
- `app/globals.css:3-68` — Light theme tokens (`:root`)
- `app/globals.css:70-128` — Dark theme tokens (`.dark`)
- `app/globals.css:130-188` — `@theme inline` bridge to Tailwind utilities
- `app/globals.css:197-214` — Custom `shake` animation
- `postcss.config.mjs` — PostCSS configuration
- `app/[locale]/layout.tsx:27` — ThemeProvider placement
- `package.json:44` — next-themes version
- `package.json:49` — Tailwind CSS version
