# Personal Website - Technical Decisions

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| UI Library | React |
| Content | MDX (markdown files in repo) |
| Styling | Tailwind |
| Testing | Vitest + React Testing Library + Playwright |

## Project Structure

- **Monorepo:** Blog + interactive tools as routes in one app
- **Tests:** Separate `tests/` folder (not colocated)
- **Routing:** File-based via App Router

## Infrastructure

- **Hosting:** Hetzner server
- **Reverse proxy:** Caddy (containerized, only service with exposed ports 80/443)
- **Deployment:** Docker + shared external network (`web-internal`)
- **Database:** PostgreSQL (containerized, one instance with multiple DBs per app) — *not needed initially, add when shared state / persistence is required*
- **State (initial):** localStorage for game state
- **Auth:** Next.js API routes for Spotify OAuth (tokens in cookies initially)

## Multi-app Architecture

- **Infra repo:** Contains Caddy, Postgres (when needed), network definition
- **Per-app repos:** Each app has its own `docker-compose.yml`, joins `web-internal` network
- **Apps expose no ports to host** — Caddy reaches them via container DNS
- **Independent deploys:** `cd app && docker compose up -d`

## Package Manager

- **bun** (faster, also serves as runtime)

## Features Planned

- Personal blog (MDX)
- Song bingo game (Spotify integration)
- Kniffel tracker
- Future: potentially more complex tools

## Future: Remote Dev Environment

- **ttyd:** Web-based terminal (lightweight, for running Claude Code remotely)
- **Auth:** Authelia in front of ttyd (MFA, protects sensitive subdomains)
- **Access:** `term.yourdomain.com` → Caddy → Authelia → ttyd
- **Use cases:** Run Claude Code without SSH