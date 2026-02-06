# ADR-002: Styling and Theming

**Status:** Accepted
**Date:** 2026-02-06
**Decision Makers:** Pascal Kraus

## Context

The website needs a comprehensive styling system that supports light and dark themes, semantic design tokens, responsive design, and custom typography. The system must integrate cleanly with React Server Components and the shadcn/ui component pattern, while allowing per-theme personality (e.g., different monospace fonts in dark mode).

## Decision

### Tailwind CSS 4 (CSS-First Configuration)

The project uses **Tailwind CSS ^4.1.18** with the new CSS-first configuration model (`app/globals.css:1`). There is no `tailwind.config.ts` file. All theme customization happens in CSS via `@theme inline { }` blocks.

- **Entry point:** `@import "tailwindcss"` (`globals.css:1`)
- **PostCSS integration:** `@tailwindcss/postcss` as the sole plugin (`postcss.config.mjs:3`)
- **Theme registration:** `@theme inline { }` block at `globals.css:130-188` bridges CSS custom properties to Tailwind utility classes (e.g., `--color-primary: var(--primary)` enables `bg-primary`, `text-primary`, etc.)

### Color System: oklch

All color tokens use the **oklch** color space for perceptual uniformity. Colors are defined as CSS custom properties in `:root` (light) and `.dark` (dark) scopes:

- **Light theme** (`globals.css:3-68`): Warm off-white background (`oklch(0.9914 0.0098 87.4695)`), green primary, blue secondary
- **Dark theme** (`globals.css:70-128`): Warm dark background (`oklch(0.2225 0.0041 84.5879)`), all tokens have dark counterparts
- **Semantic tokens:** `background`, `foreground`, `primary`, `secondary`, `accent`, `destructive`, `muted`, `card`, `popover`, `border`, `input`, `ring`, `chart-1` through `chart-5`, `sidebar-*`, `wordle-correct`, `wordle-present`

### Theme Switching: next-themes

- **Library:** `next-themes ^0.4.6` (`package.json:44`)
- **Strategy:** `attribute="class"` — adds `"dark"` class to `<html>` element
- **Defaults:** `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`
- **Provider:** `ThemeProvider` wraps the app inside `NextIntlClientProvider` (`app/[locale]/layout.tsx:27`)
- **Toggle:** Client component with hydration-safe mounting using `useEffect` to avoid SSR mismatch, renders Sun/Moon icons from `lucide-react`

### Typography

Three font families are registered as CSS custom properties and bridged to Tailwind via `@theme inline`:

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `--font-sans` | Quicksand, system-ui, sans-serif | Quicksand, system-ui, sans-serif |
| `--font-serif` | Lora, Georgia, serif | Lora, Georgia, serif |
| `--font-mono` | Fira Code, monospace | Special Elite, ui-serif, serif |

The dark mode monospace swap to **Special Elite** (`globals.css:107`) is an intentional design choice that gives dark mode a playful, typewriter aesthetic.

### Shadow System

Light and dark themes have distinctly different shadow aesthetics:

- **Light** (`globals.css:42-65`): Subtle warm shadows with `0.08` opacity, `4px` y-offset, `12px` blur, using `hsl(27.27 10.48% 20.59%)`
- **Dark** (`globals.css:109-127`): Dramatic shadows with `0.4` opacity, `8px` y-offset, `20px` blur, using pure black

### Layout Tokens

- **Spacing base:** `--spacing: 0.25rem` (`globals.css:67`)
- **Border radius:** Base `--radius: 1rem`, computed variants via `calc()` at `globals.css:168-171` (`sm: -4px`, `md: -2px`, `lg: base`, `xl: +4px`)
- **Letter spacing:** Base `--tracking-normal: 0.01em` with computed tighter/wider variants (`globals.css:182-187`)

### Custom Animations

Only one custom animation exists: `shake` for Wordle invalid guess feedback (`globals.css:197-214`).

## Consequences

### Positive
- CSS-first Tailwind 4 config eliminates the JS config file and keeps all design tokens in one CSS file
- oklch provides perceptually uniform color spacing — adjusting lightness/chroma is predictable
- Semantic tokens (`primary`, `secondary`, etc.) decouple component styles from specific color values
- `@theme inline` block makes all CSS variables available as Tailwind utilities (`bg-primary`, `text-muted-foreground`, etc.)
- Per-theme typography gives each mode a distinct personality without extra complexity
- `disableTransitionOnChange` prevents flash-of-wrong-theme during switches

### Negative
- oklch has limited browser DevTools support for visual color picking
- The `@theme inline` bridge layer adds ~60 lines of boilerplate to map CSS vars to Tailwind tokens
- Per-theme font changes (monospace) may surprise users who expect consistency across themes
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
