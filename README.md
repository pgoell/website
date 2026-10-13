# pgoell.com

Personal website built with Next.js, featuring a blog and games.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS 4
- **Internationalization:** next-intl (EN/DE)
- **Content:** MDX for blog posts
- **Linting:** Biome
- **Testing:** Vitest
- **Runtime:** Bun

## Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Run linter
bun run check

# Run tests
bun run test

# Production build
bun run build
```

## Features

- **Blog** — MDX-powered blog at `/blog`
- **Wordle** — Word guessing game at `/games/wordle` with English and German word lists

## Deployment

Deployed on Hetzner VPS via Docker with Caddy reverse proxy handling HTTPS.

Publishing a release deploys it to production. The `Deploy` workflow builds the image on GitHub, pushes it to GHCR and sends the tag to the VPS over SSH. Run it by hand to deploy any ref to dev.
