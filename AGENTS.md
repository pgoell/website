# AGENTS.md - Personal Website Project Guide

## PROJECT OVERVIEW

Personal website for sharing CV, skills, and blog posts. Hosted on GitHub Pages.

## TECH STACK

- **Framework**: Astro (static site generator)
- **Styling**: Tailwind CSS
- **Content**: Markdown files (compatible with Obsidian)
- **Deployment**: GitHub Pages with GitHub Actions
- **Language**: TypeScript

## PROJECT STRUCTURE

```
/
├── src/
│   ├── content/
│   │   ├── blog/           # Blog posts (.md files)
│   │   ├── cv/             # CV sections (.md files)
│   │   └── config.ts       # Content collections schema
│   ├── components/         # Reusable Astro/React components
│   ├── layouts/           # Page layouts
│   └── pages/             # Routes (index, about, blog, etc.)
├── public/                # Static assets
└── .github/workflows/     # GitHub Actions deployment
```

## CONTENT MANAGEMENT

- **Markdown files** should be in `src/content/`
- **Frontmatter schema** defined in `src/content/config.ts`
- **Obsidian compatibility** - standard markdown syntax
- **Blog posts** use date-based URLs (`/blog/YYYY-MM-DD-title`)

## AGENT BEHAVIOR GUIDELINES

### WHEN EDITING CODE:

- Use TypeScript for all new files
- Follow Astro conventions for component structure
- Use Tailwind utility classes for styling
- Maintain type safety with content collections

### WHEN ADDING CONTENT:

- Create markdown files in appropriate `/content` subdirectories
- Include required frontmatter fields (title, date, etc.)
- Use semantic HTML in layouts
- Optimize for static generation

### WHEN TROUBLESHOOTING:

- Check Astro build output for static generation issues
- Verify content collection schemas match frontmatter
- Test deployment workflow in `.github/workflows/`

### KEY ASTRO CONCEPTS:

- **Islands Architecture** - Only ship JavaScript for interactive components
- **Content Collections** - Type-safe markdown content management
- **Static by default** - Perfect for GitHub Pages

## DEPLOYMENT

- Pushes to `main` branch trigger automatic deployment
- Site builds to `/dist` and deploys to GitHub Pages
- No server-side rendering - fully static output

## AI ASSISTANT PRIORITIES:

1. Maintain static site performance
2. Keep TypeScript strict typing
3. Preserve Obsidian markdown compatibility
4. Follow Astro best practices
5. Optimize for GitHub Pages hosting
