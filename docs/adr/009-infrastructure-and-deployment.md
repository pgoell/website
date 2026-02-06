# ADR-009: Infrastructure and Deployment

**Status:** Accepted
**Date:** 2026-02-06
**Decision Makers:** Pascal Kraus

## Context

The personal website needs reliable, cost-effective hosting with full control over the deployment pipeline. As a developer-focused personal site, vendor lock-in to platform-as-a-service providers was undesirable — the infrastructure itself serves as a learning platform and should support multiple applications beyond just this website. The deployment model needed to be simple enough for a single maintainer while supporting both development and production environments.

## Decision

### Hosting and Server

The site is self-hosted on a **Hetzner** dedicated server with a **self-hosted GitHub Actions runner** for CI/CD execution. This provides full root access, predictable pricing, and no usage-based billing surprises.

### Container Architecture

The application uses a **multi-stage Docker build** (`Dockerfile`) based on `oven/bun:1-alpine`:

1. **base** stage: `oven/bun:1-alpine` base image
2. **deps** stage: installs dependencies with `bun install --frozen-lockfile`
3. **builder** stage: copies source files and `node_modules`, runs `bun run build` to produce standalone output
4. **runner** stage: copies only `.next/standalone` and `.next/static`, runs as a non-root user (`nextjs:1001` / `nodejs:1001` group) on port 3000 with `NODE_ENV=production` and `HOSTNAME=0.0.0.0`

The final command is `bun server.js`, using bun as the production runtime.

### Docker Compose

Two compose files manage environments:

- **`docker-compose.dev.yml`** — container named `website-dev`
- **`docker-compose.prod.yml`** — container named `website-prod`

Both are nearly identical: `restart: unless-stopped`, connected to an external `web` Docker network, `NODE_ENV=production`. Neither file exposes port mappings — applications are only accessible through the shared `web` network via the reverse proxy.

### Reverse Proxy

**Caddy** runs in a separate infrastructure repository as its own container, handling:

- HTTPS termination (ports 80/443 with automatic certificate management)
- HTTP compression (the app explicitly disables compression via `compress: false` in `next.config.ts:12`)
- Request routing to backend containers over the shared `web` network

### Network Architecture

An **external Docker network `web`** is shared between Caddy and all application containers. Each application repository contains its own `docker-compose.yml` that joins this network. The infrastructure repository manages Caddy and shared services. This multi-app architecture allows adding new applications (future PostgreSQL, ttyd, Authelia) by simply joining the same network.

### CI/CD Pipeline

Three GitHub Actions workflows:

- **`ci.yml`**: Runs on PRs and pushes to main — checkout → setup bun → install → `bun run check` → `bun run build`. Note: does not run tests.
- **`deploy-dev.yml`**: Manual `workflow_dispatch` trigger — runs on self-hosted runner → `docker compose build` → `docker compose up -d` → `docker image prune`
- **`deploy-production.yml`**: Triggered by GitHub release publish events — runs on self-hosted runner → `docker compose build` → `docker compose up -d` → `docker image prune`

Deployments are intentionally manual (dev) or release-gated (production) rather than continuous, providing a deliberate checkpoint before changes reach each environment.

## Consequences

### Positive
- Full control over the server, network, and deployment pipeline with zero vendor lock-in
- Predictable monthly cost regardless of traffic spikes (no usage-based billing)
- Multi-stage Docker build produces a minimal production image (~50MB standalone output)
- Non-root container user follows security best practices
- Caddy's automatic HTTPS eliminates certificate management overhead
- The shared `web` network pattern scales to multiple applications trivially
- Self-hosted runner enables deployment without exposing SSH credentials in CI

### Negative
- Single server is a single point of failure (no redundancy or auto-scaling)
- Self-hosted runner requires server maintenance and security updates
- No automated rollback mechanism — failed deployments require manual intervention
- CI pipeline does not run tests, relying on local testing discipline
- Two nearly-identical compose files (`dev` and `prod`) differ only in container name, creating minor duplication

### Neutral
- Compression is delegated entirely to Caddy, so the Next.js compression middleware is disabled
- The `docker image prune` step in deploy workflows keeps disk usage manageable
- Future services (PostgreSQL, Authelia) can join the `web` network without modifying existing containers

## Alternatives Considered

| Alternative | Reason Not Chosen |
|------------|-------------------|
| Vercel | Vendor lock-in, usage-based pricing at scale, limited control over infrastructure |
| Netlify | Similar vendor lock-in concerns; less suitable for server-rendered Next.js with standalone output |
| Railway / Render | Abstraction layer over containers removes learning opportunity; cost scales with usage |
| AWS / GCP | Complexity overkill for a personal site; requires significant DevOps knowledge for comparable setup |
| Bare metal without containers | Harder to reproduce environments, no isolation between applications, manual dependency management |
| Nginx reverse proxy | Caddy chosen for automatic HTTPS and simpler configuration syntax |
| Continuous deployment (auto-deploy on push) | Deliberate deployment gates preferred for a single-maintainer project |

## References

- `Dockerfile` — Multi-stage build definition (base, deps, builder, runner stages)
- `docker-compose.dev.yml` — Development environment compose configuration
- `docker-compose.prod.yml` — Production environment compose configuration
- `next.config.ts:12` — `compress: false` delegating to Caddy
- `.github/workflows/ci.yml` — CI pipeline (lint + build)
- `.github/workflows/deploy-dev.yml` — Development deployment workflow
- `.github/workflows/deploy-production.yml` — Production deployment workflow
