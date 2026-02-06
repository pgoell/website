# ADR-004: UI Component Architecture

**Status:** Accepted
**Date:** 2026-02-06
**Decision Makers:** Pascal Kraus

## Context

The website needs reusable, accessible UI components that integrate with the Tailwind-based design token system. The components must support theme variants, be fully owned by the project (not locked to a third-party component library's release cycle), and provide accessibility out of the box without manual ARIA management.

## Decision

### Pattern: shadcn/ui (Owned Components)

The project follows the **shadcn/ui** pattern where components are copied into the project and owned by the codebase, rather than imported from a package. This means components live in `components/ui/` and can be freely modified.

Currently, only **two** base UI components exist:

1. **Button** (`components/ui/button.tsx`)
2. **DropdownMenu** (`components/ui/dropdown-menu.tsx`)

### Utility: cn()

The standard shadcn/ui utility function is defined in `lib/utils.ts:4-6`:

```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

This combines `clsx` for conditional class composition with `tailwind-merge` for deduplication of conflicting Tailwind classes (e.g., `bg-red-500` + `bg-blue-500` resolves to the latter).

### Button Component

The Button (`components/ui/button.tsx`) uses **class-variance-authority (CVA)** for type-safe variant management:

**Variants** (`button.tsx:11-22`):
| Variant | Style |
|---------|-------|
| `default` | Primary background with white foreground |
| `destructive` | Destructive color with dark mode opacity adjustment |
| `outline` | Bordered with background, dark mode uses `input/30` |
| `secondary` | Secondary background colors |
| `ghost` | Transparent, hover reveals accent |
| `link` | Text-only with underline on hover |

**Sizes** (`button.tsx:24-32`):
| Size | Dimensions |
|------|-----------|
| `default` | `h-9 px-4 py-2` |
| `xs` | `h-6 px-2` with smaller text and icons |
| `sm` | `h-8 px-3` |
| `lg` | `h-10 px-6` |
| `icon` | `size-9` (square) |
| `icon-xs` | `size-6` |
| `icon-sm` | `size-8` |
| `icon-lg` | `size-10` |

**Key features:**
- Uses `@radix-ui/react-slot` (`button.tsx:1`) for polymorphism via the `asChild` prop (`button.tsx:45, 51`) — allows rendering as `<a>`, `<Link>`, or any other element while keeping button styling
- Emits `data-slot="button"`, `data-variant`, and `data-size` attributes (`button.tsx:55-57`) for CSS targeting and testing
- Built-in states: `focus-visible` ring, `aria-invalid` destructive ring, `disabled` opacity (`button.tsx:8`)
- Automatic SVG sizing: `[&_svg:not([class*='size-'])]:size-4` (`button.tsx:8`)

### DropdownMenu Component

The DropdownMenu (`components/ui/dropdown-menu.tsx`) is a thin wrapper over `@radix-ui/react-dropdown-menu` that adds Tailwind styling to each Radix primitive:

- **Re-exported primitives:** Root, Trigger, Group, Portal, Sub, RadioGroup (`dropdown-menu.tsx:9-19`)
- **Styled wrappers:** SubTrigger, SubContent, Content, Item, CheckboxItem, RadioItem, Label, Separator, Shortcut (`dropdown-menu.tsx:21-205`)
- **Portal rendering:** Content renders through `DropdownMenuPrimitive.Portal` (`dropdown-menu.tsx:65`) for proper z-index stacking
- **Animations:** Uses Tailwind's `animate-in`/`animate-out` with directional slide-in classes based on `data-[side=*]` attributes (`dropdown-menu.tsx:70`)
- **Accessibility:** Inherits full keyboard navigation, focus management, and ARIA attributes from Radix

**Note:** The `SiteNav` component does **not** use this DropdownMenu component — it implements its own custom dropdown for navigation, which is an architectural inconsistency.

### Icon System

- **UI icons:** `lucide-react ^0.563.0` (`package.json:40`) — used for theme toggle (Sun/Moon), dropdown arrows (ChevronRight), indicators (Check, Circle)
- **Social icons:** Custom inline SVGs (not from lucide) for GitHub, LinkedIn, etc.

### Radix Primitives

Two Radix packages are used:
- `@radix-ui/react-dropdown-menu ^2.1.16` (`package.json:33`) — Full dropdown menu primitive
- `@radix-ui/react-slot ^1.2.4` (`package.json:34`) — Polymorphic component composition (used in Button)

## Consequences

### Positive
- Full ownership of component code — no waiting for upstream releases to fix bugs or add features
- CVA provides compile-time variant type checking — invalid variant/size combinations are caught by TypeScript
- Radix primitives provide WAI-ARIA compliant accessibility (keyboard navigation, screen reader support, focus trapping) without manual implementation
- `cn()` utility prevents Tailwind class conflicts, enabling safe class composition and overrides
- `data-slot` attributes enable CSS-based component targeting without fragile class selectors
- The `asChild` pattern via Radix Slot enables flexible component composition (e.g., button-styled links)

### Negative
- Only 2 base components exist; new components must be manually added from shadcn/ui or built from scratch
- The SiteNav dropdown inconsistency means two different dropdown implementations coexist
- Radix adds ~20KB to the client bundle for dropdown functionality
- CVA + clsx + tailwind-merge is three dependencies for class management (though each is small)

### Neutral
- The shadcn/ui pattern means components diverge from upstream over time (intentional — they're project-owned)
- lucide-react provides a large icon set but only a handful are actually used
- The DropdownMenu component includes RadioItem, CheckboxItem, and SubMenu variants that aren't currently used in the project

## Alternatives Considered

| Alternative | Reason Not Chosen |
|------------|-------------------|
| Headless UI | Less comprehensive primitive set than Radix; Tailwind Labs product but fewer components |
| Ark UI | Newer ecosystem, less community adoption and documentation at time of decision |
| MUI (Material UI) | Opinionated visual design; CSS-in-JS conflicts with React Server Components |
| Ant Design | Heavy bundle size; visual style doesn't match the site's warm, personal aesthetic |
| Fully custom components | Would require implementing accessibility (ARIA, keyboard nav, focus management) from scratch |
| Tailwind Variants (tv) | CVA was already the shadcn/ui standard; switching would diverge from the established pattern |

## References

- `components/ui/button.tsx` — Button component with CVA variants
- `components/ui/dropdown-menu.tsx` — DropdownMenu Radix wrapper
- `lib/utils.ts` — `cn()` utility function
- `package.json:33-34` — Radix UI dependencies
- `package.json:37` — class-variance-authority
- `package.json:38` — clsx
- `package.json:48` — tailwind-merge
- `package.json:40` — lucide-react icons
