# Claude Code Project Guide

This document contains important information for working on this project with Claude Code or as a developer.

## Version Control: Jujutsu (jj)

This project uses **Jujutsu (jj)** as the primary version control interface, while maintaining full Git compatibility.

### Why jj?

- **Simpler workflow** - No staging area, working copy is always a commit
- **Safe history editing** - Automatic rebasing and conflict propagation
- **Git compatible** - Works seamlessly with GitHub and Git remotes
- **Undoable operations** - Every action is recorded and reversible

### Quick Start with jj

```bash
# Check status
jj status

# View commit history
jj log

# Create a new commit (starts fresh work)
jj new

# Add a commit message
jj describe -m "Your message here"

# Push to GitHub
jj git push --bookmark your-branch-name

# Fetch from GitHub
jj git fetch

# Rebase on main
jj rebase -d main
```

**Important:** Changes are automatically tracked - no `git add` needed! Your working directory IS the current commit.

### Full Reference

See [docs/JJ_REFERENCE.md](docs/JJ_REFERENCE.md) for comprehensive jj documentation.

---

## Branch Naming Convention

We use **conventional branch naming** with prefixes that indicate the type of work:

### Branch Prefixes

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features or enhancements | `feature/user-authentication` |
| `fix/` | Bug fixes | `fix/login-validation` |
| `chore/` | Maintenance tasks, deps updates | `chore/update-dependencies` |
| `docs/` | Documentation changes | `docs/api-reference` |
| `refactor/` | Code refactoring (no feature change) | `refactor/auth-module` |
| `test/` | Adding or updating tests | `test/user-service` |
| `perf/` | Performance improvements | `perf/optimize-queries` |
| `style/` | Code style/formatting changes | `style/prettier-config` |

### Naming Guidelines

- Use lowercase and hyphens (kebab-case)
- Be descriptive but concise
- Good: `feature/spotify-oauth`
- Bad: `feature/add_new_feature` or `myfeature`

### Using Branches with jj

In jj, you create **bookmarks** which become Git branches when pushed:

```bash
# Create a bookmark for your work
jj bookmark create feature/dark-mode

# Make your changes...
jj describe -m "Implement dark mode toggle"

# Push to GitHub (creates Git branch)
jj git push --bookmark feature/dark-mode

# On GitHub, this appears as branch: feature/dark-mode
```

### Workflow Example

```bash
# 1. Start new feature
jj new
jj bookmark create feature/blog-search

# 2. Make changes and describe your work
jj describe -m "Add blog search functionality"

# 3. Continue working (create more commits as needed)
jj new
jj describe -m "Add search UI component"

# 4. Push to GitHub for PR (simplified with helper)
make jj-push BOOKMARK=feature/blog-search

# Or manually:
# jj bookmark set feature/blog-search       # Move bookmark to current commit
# jj bookmark track feature/blog-search --remote=origin  # Track on remote
# jj git push --bookmark feature/blog-search

# 5. After PR is merged, delete local bookmark
jj bookmark delete feature/blog-search
```

**Note:** The `make jj-push` command automatically:
- Moves the bookmark to your current commit
- Tracks the bookmark on the remote (if needed)
- Pushes to GitHub

---

## Commit Message Convention

Follow conventional commit format:

```
<type>: <description>

[optional body]

[optional footer]
```

### Commit Types

- `feat:` - New feature
- `fix:` - Bug fix
- `chore:` - Maintenance task
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Tests
- `perf:` - Performance
- `style:` - Formatting

### Examples

```bash
jj describe -m "feat: add Spotify OAuth integration"

jj describe -m "fix: resolve login redirect loop"

jj describe -m "chore: update dependencies to latest versions"

jj describe -m "docs: add setup instructions to README"
```

---

## Git Compatibility

### Working with GitHub

This project maintains full Git compatibility:

- **jj bookmarks** → **Git branches** on GitHub
- **Pull Requests** work normally
- **Collaborators** can use regular Git commands
- **CI/CD** sees standard Git commits

### Syncing with Remote

```bash
# Fetch latest from GitHub
jj git fetch

# Rebase your work on main
jj rebase -d main@origin

# Push your changes
jj git push
```

### If You Prefer Git

You can still use Git commands directly:

```bash
git status
git pull
git push
# etc.
```

jj and git can be used interchangeably in this repo (colocated workspace).

---

## Project Structure

```
website/
├── src/                  # Source code
│   ├── app/             # Next.js App Router pages
│   ├── components/      # React components
│   ├── lib/             # Utilities
│   └── styles/          # Global styles
├── content/             # MDX content
│   └── blog/            # Blog posts
├── tests/               # Tests
│   ├── unit/            # Unit tests (Vitest)
│   └── e2e/             # E2E tests (Playwright)
├── docs/                # Documentation
├── scripts/             # Build/setup scripts
└── Makefile             # Common commands
```

---

## Development Workflow

### First Time Setup

```bash
# Run setup script
make setup
```

This checks for:
- ✓ bun installation (required)
- ✓ jj installation (optional but recommended)
- Initializes jj if installed

### Common Commands

See `make help` for all available commands:

```bash
make setup      # Initial setup
make dev        # Start dev server
make build      # Production build
make test       # Run tests
```

---

## For Claude Code

When working on this project:

1. **Use jj for version control operations** when possible
2. **Create bookmarks** using the branch naming convention
3. **Follow commit message conventions**
4. **Check [docs/JJ_REFERENCE.md](docs/JJ_REFERENCE.md)** for jj command reference
5. **Refer to [docs/PLAN.md](docs/PLAN.md)** for technical decisions

### Example Claude Workflow

When implementing a feature:

```bash
# 1. Create bookmark
jj bookmark create feature/new-component

# 2. Make changes
# (edit files)

# 3. Describe work
jj describe -m "feat: add new component for X"

# 4. If needed, create additional commits
jj new
jj describe -m "feat: add tests for new component"

# 5. Push for review
jj git push --bookmark feature/new-component
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start new work | `jj new` + `jj bookmark create <name>` |
| Check status | `jj status` |
| View history | `jj log` |
| Describe changes | `jj describe -m "message"` |
| Push to GitHub | `jj git push --bookmark <name>` |
| Fetch updates | `jj git fetch` |
| Rebase on main | `jj rebase -d main` |
| Undo last operation | `jj undo` |

---

## Additional Resources

- **Full jj guide**: [docs/JJ_REFERENCE.md](docs/JJ_REFERENCE.md)
- **Technical decisions**: [docs/PLAN.md](docs/PLAN.md)
- **Official jj docs**: https://jj-vcs.github.io/jj/latest/
