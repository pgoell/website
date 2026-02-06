# ADR-006: Content Management

**Status:** Accepted
**Date:** 2026-02-06
**Decision Makers:** Pascal Kraus

## Context

The website includes a personal blog that requires authoring rich content (text, code snippets, and potentially embedded React components) in two languages (English and German). A content management approach was needed that supports bilingual content, integrates naturally with the Next.js App Router, allows version-controlled authoring, and keeps the setup minimal for a personal site without requiring external services or databases.

## Decision

Blog content is managed as **local MDX files** processed at build time and rendered via server-side MDX compilation. The system has three layers: content files, a loading library, and rendering pages.

### Content Storage

MDX files are stored in the repository organized by locale:

```
content/
  en/
    hello-world.mdx
  de/
    hello-world.mdx
```

Each file uses YAML frontmatter with the following schema:

```yaml
title: "Post Title"          # Required — displayed in listings and page
date: "YYYY-MM-DD"           # Required — used for sorting and display
description: "Summary text"  # Required — shown in blog index
translationKey: "post-id"    # Optional — links equivalent posts across locales
```

The `PostMeta` TypeScript interface in `lib/posts.ts` mirrors this structure:

```typescript
interface PostMeta {
  slug: string;
  title: string;
  date: string;
  description: string;
  translationKey?: string;
}
```

### Content Loading — `lib/posts.ts`

Three server-only functions use Node.js `fs` and `gray-matter` to load content:

- **`getPostSlugs(locale)`** — reads `content/{locale}/`, filters `.mdx` files, strips extensions to produce slug list
- **`getPostBySlug(locale, slug)`** — reads a single file, parses frontmatter with `gray-matter`, returns `{ meta: PostMeta, content: string }`
- **`getAllPosts(locale)`** — loads all posts for a locale, returns them sorted by date descending

### MDX Rendering

- **Blog index** (`app/[locale]/blog/page.tsx`) — server component that calls `getAllPosts(locale)` and renders a list of `Link` elements with title, date, and description
- **Blog post** (`app/[locale]/blog/[slug]/page.tsx`) — server component that renders individual posts using `MDXRemote` from `next-mdx-remote/rsc` for server-side MDX compilation
- **Static generation** — `generateStaticParams()` pre-renders all locale + slug combinations at build time
- **404 handling** — `notFound()` is called for missing slugs

### MDX Component Customization

Custom component mapping is defined in `mdx-components.tsx` at the project root. Currently minimal — only `h1` is styled with Tailwind classes. The `@tailwindcss/typography` plugin is deliberately not used due to incompatibility with Tailwind v4.

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@next/mdx` | ^16.1.6 | Next.js MDX integration |
| `@mdx-js/loader` | ^3.1.1 | Webpack loader for MDX files |
| `@mdx-js/react` | ^3.1.0 | React context provider for MDX components |
| `next-mdx-remote` | ^5.0.0 | Server-side MDX compilation (`MDXRemote` from `/rsc`) |
| `gray-matter` | ^4.0.3 | YAML frontmatter parsing |

### What is NOT configured

- No remark or rehype plugins (no syntax highlighting, no GFM extensions, no auto-linking)
- No table of contents generation
- No reading time estimation
- No RSS feed generation
- No draft/published status field
- No tags or categories

## Consequences

### Positive
- Content is version-controlled alongside code — PRs for blog posts get the same review workflow
- No external service dependencies — no CMS accounts, API keys, or network calls at build time
- MDX allows embedding React components directly in posts when needed (e.g., interactive demos)
- Bilingual content is cleanly separated by locale directory with optional cross-linking via `translationKey`
- Server-side rendering via `next-mdx-remote/rsc` means zero client-side JavaScript for blog post content
- Build-time static generation produces fast, cacheable HTML pages

### Negative
- Adding a post requires a code commit and deployment — no web-based editing UI
- No built-in content search, tagging, or filtering capabilities
- Manual frontmatter management with no validation beyond TypeScript types (no Zod schema, no build-time checks)
- The `translationKey` cross-linking mechanism exists in the type but has no UI implementation yet
- Content and code are coupled in the same repository, which may not scale for high-volume blogging

### Neutral
- Currently only one post exists (`hello-world`) in both locales — the system is designed for growth but lightly exercised
- No syntax highlighting means code blocks render as plain styled text
- The `@tailwindcss/typography` incompatibility with Tailwind v4 means all MDX element styles must be manually defined in `mdx-components.tsx`

## Alternatives Considered

| Alternative | Reason Not Chosen |
|------------|-------------------|
| Headless CMS (Contentful, Sanity, Strapi) | Adds external dependency, API complexity, and cost for a personal blog with minimal content; overkill for current scale |
| Plain Markdown without MDX | Loses ability to embed React components in posts; MDX is a superset with no downside for simple content |
| Notion API as content source | Ties content to a proprietary platform, adds runtime API dependency, requires mapping Notion blocks to React components |
| Database-backed CMS (WordPress, Ghost) | Requires separate hosting, database management, and a different tech stack; doesn't integrate with the existing Next.js setup |
| Content collections (Astro-style) | Not natively supported by Next.js; would require custom build tooling or switching frameworks |

## References

- `content/en/hello-world.mdx` — Example English blog post
- `content/de/hello-world.mdx` — Example German blog post
- `lib/posts.ts` — Content loading functions (`getPostSlugs`, `getPostBySlug`, `getAllPosts`)
- `app/[locale]/blog/page.tsx` — Blog index page (server component)
- `app/[locale]/blog/[slug]/page.tsx` — Blog post page (server component with MDXRemote)
- `mdx-components.tsx` — Custom MDX component styling
- `next.config.ts` — MDX plugin configuration
