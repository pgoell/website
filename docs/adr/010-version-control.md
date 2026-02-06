# ADR-010: Version Control

**Status:** Accepted
**Date:** 2026-02-06
**Decision Makers:** Pascal Kraus

## Context

The project needed a version control system that integrates with GitHub for pull requests and collaboration while providing a better developer experience than raw Git for day-to-day operations. Common Git pain points — the staging area, destructive rebases, complex history editing — motivated evaluating modern alternatives that maintain full Git compatibility.

## Decision

The project uses **Jujutsu (jj)** as the primary version control system in a **colocated workspace** where both `.jj/` and `.git/` directories exist side by side. This provides Git compatibility for GitHub integration while using jj's improved interface for all local operations.

### Why Jujutsu

- **No staging area**: changes auto-track, eliminating the `git add` step entirely
- **Working copy is a commit**: the working directory is always a valid commit, providing a simpler mental model
- **Automatic rebasing of descendants**: editing any commit in the history automatically rebases all descendant commits
- **Conflict propagation**: conflicts are recorded in commits and can be resolved once, with the fix propagating downstream
- **Operation log with full undo**: every operation is recorded and undoable via `jj undo`, making history editing safe
- **Bookmarks instead of branches**: jj "bookmarks" map directly to Git branches when pushing

### Conventions

**Branch/bookmark naming** follows a prefix convention:
- `feature/` — new features
- `fix/` — bug fixes
- `chore/` — maintenance tasks
- `docs/` — documentation changes
- `refactor/` — code restructuring
- `test/` — test additions/changes
- `perf/` — performance improvements

**Commit message format**: `type: description` using the same type prefixes (e.g., `feat: add pomodoro timer`, `fix: mobile header alignment`).

### PR Workflow

```
jj describe -m "feat: description"           # Describe current change
jj bookmark create feature/name              # Create bookmark (Git branch)
jj bookmark track feature/name --remote=origin
jj git push --bookmark feature/name          # Push to GitHub
gh pr create --head feature/name --base master
```

### Syncing with upstream

```
jj git fetch && jj rebase -d master
```

### Makefile Integration

The `Makefile` provides convenience targets:
- `make jj-push BOOKMARK=name` — push a specific bookmark
- `make jj-status` — check current status
- `make jj-log` — view history

### User Preferences

Enforced via `CLAUDE.md` project instructions:
- Never auto-commit or auto-push — all commits and pushes are explicit user actions
- Always use `jj` commands instead of native `git` commands
- User identity only on all commits (no AI co-author attribution)

A comprehensive reference document exists at `docs/JJ_REFERENCE.md` covering all common operations.

## Consequences

### Positive
- Auto-tracking eliminates forgotten unstaged files — every change is always part of a commit
- Safe history editing via operation log removes the fear of `git rebase` destroying work
- Conflict propagation makes multi-commit rebases significantly less painful
- Full Git compatibility means GitHub PRs, Actions, and tooling work without modification
- The colocated workspace allows falling back to `git` commands if needed (though this is discouraged)

### Negative
- Jujutsu is a relatively new tool with a smaller community and fewer resources than Git
- Team members or contributors unfamiliar with jj face a learning curve
- Some Git-specific tooling (IDE integrations, GUI clients) may not fully support jj
- The colocated `.jj/` + `.git/` workspace uses slightly more disk space
- AI coding assistants default to Git commands and must be explicitly instructed to use jj

### Neutral
- The `.jj/` directory is gitignored and does not affect the repository for Git-only users
- Bookmarks and Git branches are conceptually equivalent — the mental model maps cleanly
- The Makefile targets provide a convenience layer but are not required for any workflow

## Alternatives Considered

| Alternative | Reason Not Chosen |
|------------|-------------------|
| Plain Git | Staging area friction, destructive rebases, no operation log for safe undo |
| Sapling (Meta) | Less mature Git interop at evaluation time; smaller community than jj |
| Pijul | Patch-based model is interesting but limited Git compatibility and ecosystem |
| Fossil | Built-in wiki/tickets not needed; weaker GitHub integration |
| Git with aliases/scripts | Addresses symptoms but not root causes (mental model complexity, conflict handling) |

## References

- `docs/JJ_REFERENCE.md` — Comprehensive Jujutsu reference document
- `CLAUDE.md` — Project instructions including jj conventions and user preferences
- `Makefile` — Convenience targets for jj operations (`jj-push`, `jj-status`, `jj-log`)
- `.gitignore` — Includes `.jj/` directory exclusion
