# ADR-011: Navigation and Routing

**Status:** Accepted
**Date:** 2026-02-06
**Decision Makers:** Pascal Kraus

## Context

The website serves multiple content types — blog posts, interactive games, and utility tools — each requiring different page layouts and navigation patterns. As the number of features grew beyond a simple blog, a structured route hierarchy and consistent navigation system were needed to help users discover and move between sections. The site also requires locale-aware routing for English and German audiences.

## Decision

### Route Structure

All routes use the `[locale]` dynamic segment for internationalization, creating a two-level content hierarchy organized by category:

```
app/[locale]/
├── page.tsx                        (home)
├── blog/                           (content section)
│   ├── page.tsx                    (blog index)
│   └── [slug]/page.tsx             (individual blog post)
├── games/                          (interactive games)
│   ├── page.tsx                    (games index — card grid)
│   ├── wordle/page.tsx
│   ├── wordle/demo/page.tsx
│   ├── wordle/solver/page.tsx
│   └── kniffel/page.tsx
└── tools/                          (utility tools)
    ├── page.tsx                    (tools index — card grid)
    └── pomodoro/page.tsx
```

### Layout Hierarchy

Two nested layouts wrap all pages:

1. **Root layout** (`app/layout.tsx`): imports `globals.css`, sets up the base HTML structure
2. **Locale layout** (`app/[locale]/layout.tsx`): wraps content with `ThemeProvider`, `NextIntlClientProvider`, renders the `Header` component, and constrains content width via `<main className="max-w-3xl">`

### Header and Navigation

The **Header** (`components/header.tsx`) is a sticky client component containing:
- **SiteNav** dropdown for page navigation
- Social links (GitHub, LinkedIn)
- **LanguageSwitcher** for toggling between `en` and `de`
- **ThemeToggle** for light/dark mode

The **SiteNav** component (`components/site-nav.tsx`) implements a custom dropdown menu using:
- `useState` for open/close state
- `useRef` with click-outside detection for dismissal
- Manual `Escape` key handling for keyboard accessibility
- ARIA attributes: `aria-expanded`, `aria-haspopup`, `role="menu"`, `role="menuitem"`
- Four navigation links: Home, Blog, Games, Tools
- Translation namespace: `"nav"` via `useTranslations("nav")`

This is a **custom implementation** rather than using the Radix UI `DropdownMenu` primitive that other shadcn/ui components are built on. The custom approach provides full control over the simple four-link menu without the additional bundle weight of Radix's full dropdown system.

### Section Index Pages

Games (`app/[locale]/games/page.tsx`) and Tools (`app/[locale]/tools/page.tsx`) index pages follow a shared pattern:
- Server component with `getTranslations()` for i18n
- `<h1>` heading with subtitle paragraph
- Responsive card grid: `grid gap-4 sm:grid-cols-2`
- Cards styled with `rounded-2xl border bg-card/60`
- Call-to-action using shadcn `Button` with `asChild` wrapping a `Link`

### Language Switching

The **LanguageSwitcher** component performs a simple `pathname.replace()` to swap between `/en/...` and `/de/...`, preserving the current route path.

### Known Inconsistencies

- **SiteNav vs. Radix DropdownMenu**: the navigation dropdown is hand-rolled while other UI components use Radix primitives via shadcn/ui
- **Back navigation**: games pages include manual back links (with hardcoded locale in the path), while tools pages have no back links
- **Locale prop handling**: game pages pass `locale` as a prop to client components, while tools pages do not

These inconsistencies reflect organic growth as features were added at different times. They are documented here for awareness rather than as immediate action items.

## Consequences

### Positive
- The `[locale]` segment pattern provides clean, SEO-friendly URLs for both languages (`/en/games/wordle`, `/de/games/wordle`)
- Category-based grouping (games, tools, blog) provides a clear mental model for both navigation and file organization
- The card grid pattern for index pages is visually consistent and easy to extend with new features
- Custom SiteNav keeps the navigation bundle small for a simple four-link menu
- Sticky header ensures navigation is always accessible regardless of scroll position

### Negative
- Custom dropdown requires manual ARIA implementation that Radix DropdownMenu would provide automatically
- Inconsistent back navigation between games and tools sections creates a fragmented UX
- Hardcoded locale in back links is fragile and could break if locale handling changes
- No breadcrumb trail for deep pages (e.g., `/games/wordle/solver`) — users rely on the dropdown or browser back
- Section index pages duplicate layout patterns rather than sharing a generic section index component

### Neutral
- The four-link navigation is sufficient for the current site scope but would need redesign for significantly more sections
- `max-w-3xl` content constraint in the locale layout works well for reading content but may be limiting for wider interactive features
- The `LanguageSwitcher` approach of pathname replacement is simple but doesn't preserve query parameters or hash fragments

## Alternatives Considered

| Alternative | Reason Not Chosen |
|------------|-------------------|
| Single flat navigation (no categories) | Doesn't scale as features grow; no organizational structure for 5+ distinct pages |
| Sidebar navigation | Overkill for a personal site with four top-level sections; consumes horizontal space on mobile |
| Breadcrumb-based navigation | Adds visual clutter for a shallow route hierarchy (max 3 levels deep) |
| Tab-based section switching | Works within a section but doesn't address cross-section navigation |
| Radix DropdownMenu for SiteNav | Additional bundle size for a simple four-item menu; custom implementation provides equivalent functionality with less overhead |
| next-intl navigation API (`createNavigation`) | Simple pathname replacement was sufficient; the full navigation API adds complexity without clear benefit for two locales |

## References

- `components/header.tsx` — Sticky header with navigation, social links, language switcher, theme toggle
- `components/site-nav.tsx` — Custom dropdown navigation menu with ARIA support
- `components/language-switcher.tsx` — Locale toggle component
- `app/layout.tsx` — Root layout (CSS imports)
- `app/[locale]/layout.tsx` — Locale layout (providers, header, content width constraint)
- `app/[locale]/games/page.tsx` — Games section index page
- `app/[locale]/tools/page.tsx` — Tools section index page
- `middleware.ts` — Locale detection and routing middleware
- `i18n/config.ts` — Locale configuration (`en`, `de`)
