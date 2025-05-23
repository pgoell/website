# Opinionated Astro + TypeScript Style Guide

## Core Philosophy

**Zero ambiguity. Maximum consistency. Ruthlessly opinionated.**

This guide prioritizes readability, maintainability, and developer experience over personal preferences. Every decision has been made to eliminate cognitive overhead and bikeshedding.

## File Organization

### Directory Structure (MANDATORY)
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI primitives (Button, Input, etc.)
│   └── blocks/         # Composite components (Header, Footer, etc.)
├── layouts/            # Page layouts only
├── pages/              # File-based routing
├── content/            # Content collections
├── styles/             # Global styles and utilities
├── utils/              # Pure utility functions
├── types/              # TypeScript type definitions
└── constants/          # App-wide constants
```

### File Naming (STRICT)
- **Components**: `PascalCase.astro` (e.g., `BlogPost.astro`, `UserProfile.astro`)
- **Pages**: `kebab-case.astro` (e.g., `about-us.astro`, `contact.astro`)
- **Utilities**: `camelCase.ts` (e.g., `formatDate.ts`, `validateEmail.ts`)
- **Types**: `PascalCase.ts` (e.g., `User.ts`, `BlogPost.ts`)
- **Constants**: `SCREAMING_SNAKE_CASE.ts` (e.g., `API_ENDPOINTS.ts`)

## Component Architecture

### Component Structure (ENFORCED)
```astro
---
// 1. Type imports first
import type { ComponentProps } from 'astro/types'

// 2. External library imports
import { format } from 'date-fns'

// 3. Internal imports (components, utils, types)
import Button from '@/components/ui/Button.astro'
import { formatCurrency } from '@/utils/formatCurrency'
import type { Product } from '@/types/Product'

// 4. Props interface (always export)
export interface Props {
  title: string
  description?: string
  isActive?: boolean
}

// 5. Props destructuring with defaults
const {
  title,
  description = '',
  isActive = false,
} = Astro.props
---

<!-- 6. HTML template -->
<article class="product-card" data-active={isActive}>
  <h2>{title}</h2>
  {description && <p>{description}</p>}
</article>

<!-- 7. Scoped styles last -->
<style>
  .product-card {
    padding: 1rem;
  }
</style>
```

### Props Rules (NON-NEGOTIABLE)
1. **Always export Props interface**
2. **Use optional props with defaults in destructuring**
3. **No inline prop types**
4. **Boolean props default to `false`**
5. **String props requiring values should not be optional**

## TypeScript Rules

### Import Organization (AUTO-SORTED)
```typescript
// 1. Type-only imports first
import type { ComponentProps } from 'astro/types'
import type { User } from '@/types/User'

// 2. External libraries (alphabetical)
import { clsx } from 'clsx'
import { format } from 'date-fns'

// 3. Internal imports (alphabetical)
import Button from '@/components/ui/Button.astro'
import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS'
import { validateEmail } from '@/utils/validateEmail'
```

### Naming Conventions (STRICT)
- **Variables/Functions**: `camelCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`
- **Enums**: `PascalCase` with `PascalCase` values
- **Files**: See file naming section above

### Type Definitions (MANDATORY)
```typescript
// ✅ GOOD: Explicit and descriptive
interface BlogPost {
  id: string
  title: string
  content: string
  publishedAt: Date
  author: User
  tags: readonly string[]
  isPublished: boolean
}

// ❌ BAD: Vague and implicit
interface Post {
  id: any
  title: string
  content?: string
  date: string
  user: object
}
```

## CSS & Styling Rules

### Class Naming (BEM-inspired)
```css
/* Component-level classes */
.blog-post {}
.blog-post__title {}
.blog-post__content {}
.blog-post--featured {}

/* Utility classes (Tailwind-style) */
.text-center {}
.mb-4 {}
.flex {}
```

### CSS Organization in Components
```astro
<style>
  /* 1. Component root styles */
  .component-name {
    /* Layout properties first */
    display: flex;
    flex-direction: column;
    
    /* Spacing */
    padding: 1rem;
    margin-bottom: 2rem;
    
    /* Visual properties */
    background-color: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  /* 2. Child element styles */
  .component-name__title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  /* 3. Modifier styles */
  .component-name--large {
    padding: 2rem;
  }
  
  /* 4. State styles */
  .component-name:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  /* 5. Media queries last */
  @media (min-width: 768px) {
    .component-name {
      padding: 1.5rem;
    }
  }
</style>
```

## Content Collections

### Schema Definition (MANDATORY)
```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content'

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.date(),
    updatedAt: z.date().optional(),
    author: z.string(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
  }),
})

export const collections = {
  blog: blogCollection,
}
```

## Performance Rules

### Image Optimization (MANDATORY)
```astro
---
import { Image } from 'astro:assets'
import heroImage from '@/assets/hero.jpg'
---

<!-- ✅ GOOD: Optimized with explicit dimensions -->
<Image
  src={heroImage}
  alt="Descriptive alt text"
  width={800}
  height={600}
  format="webp"
  quality={80}
/>

<!-- ❌ BAD: No optimization -->
<img src="/hero.jpg" alt="Hero" />
```

### Code Splitting (ENFORCED)
```astro
---
// ✅ GOOD: Client-side only when needed
import InteractiveWidget from '@/components/InteractiveWidget.astro'
---

<InteractiveWidget client:idle />
```

## Error Handling

### Component Error Boundaries
```astro
---
import { Astro } from 'astro'

const { data, error } = await fetchData().catch(err => ({ 
  data: null, 
  error: err 
}))

if (error) {
  console.error('Failed to fetch data:', error)
}
---

{error ? (
  <div class="error-state">
    <p>Unable to load content. Please try again later.</p>
  </div>
) : data ? (
  <div class="content">
    {/* Render data */}
  </div>
) : (
  <div class="loading-state">
    <p>Loading...</p>
  </div>
)}
```

## Git Commit Rules

### Commit Message Format (STRICT)
```
type(scope): description

feat(blog): add pagination to blog posts
fix(header): resolve mobile menu overflow
docs(readme): update installation instructions
style(button): apply consistent padding
refactor(auth): extract validation logic
test(utils): add date formatting tests
```

## IDE Configuration

### Required Extensions
- Astro (astro-build.astro-vscode)
- Prettier (esbenp.prettier-vscode)
- TypeScript Importer (pmneo.tsimporter)
- Tailwind CSS IntelliSense (bradlc.vscode-tailwindcss)

### VSCode Settings
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Enforcement

This style guide is enforced through:
1. **Prettier** for code formatting
2. **ESLint** for code quality
3. **TypeScript** for type safety
4. **Pre-commit hooks** for consistency
5. **Code review** for architecture decisions

**No exceptions. No compromises. This is the way.** 