# Jujutsu (jj) Reference Guide

## What is Jujutsu?

Jujutsu (jj) is a Git-compatible version control system that acts as a modern frontend to Git. It keeps Git's underlying storage format but provides a smoother workflow that eliminates many of Git's pain points.

**Key Philosophy:**
- Your working copy is always a commit
- No staging area (no `git add` needed)
- Automatic conflict tracking and propagation
- Every operation is recorded and undoable
- History editing is safe and encouraged

## Git Integration (Colocated Workspace)

When you run `jj git init --git-repo=.` in an existing Git repository, you create a **colocated workspace**:

```
your-repo/
  ├── .git/          # Git repository
  ├── .jj/           # Jujutsu metadata
  └── your files...  # Shared working copy
```

### How It Works

1. **Shared Working Copy**: Both Git and jj use the same files
2. **Automatic Sync**: jj automatically imports/exports to Git on every command
3. **Side-by-Side Usage**: You can mix `git` and `jj` commands freely
4. **Git Compatibility**: jj commits are real Git commits

**Example workflow:**
```bash
jj new                    # Create new commit (jj)
# edit files
jj describe -m "Add feature"
jj git push              # Push to Git remote (jj)
git pull                 # Pull from remote (git)
jj log                   # View history (jj)
```

## The jj Command Loop vs Git Loop

### Git's Two-Step Loop

```
Working Directory → Staging Area → Commit
     (edit)          (git add)    (git commit)
```

You must explicitly:
1. Make changes
2. Stage them (`git add`)
3. Commit them (`git commit`)

### jj's Continuous Loop

```
Working Copy = Current Commit
     (always in sync)
```

In jj:
1. **Your changes are automatically part of the current commit**
2. When done, run `jj new` to start a fresh commit
3. Use `jj describe` to add/edit commit messages anytime

**Key Difference:** No staging step! Changes are immediately in the commit.

## Core Workflow

### 1. Starting Work

```bash
# Check current state
jj status

# View commit history
jj log

# Create a new empty commit to work in
jj new
```

### 2. Making Changes

```bash
# Edit files normally...
# Changes are automatically in the current commit

# View what changed
jj diff

# View specific file changes
jj diff path/to/file
```

### 3. Describing Your Work

```bash
# Add a commit message to current commit
jj describe -m "Implement user authentication"

# Or open editor for longer message
jj describe
```

### 4. Creating More Commits

```bash
# Freeze current work and start a new commit
jj new

# Continue editing...
# The new changes are now in a new commit
```

## Common Commands Reference

### Basic Operations

| Command | Description | Git Equivalent |
|---------|-------------|----------------|
| `jj status` | Show working copy status | `git status` |
| `jj diff` | Show changes in current commit | `git diff HEAD` |
| `jj log` | Show commit history (tree view) | `git log --graph` |
| `jj show <commit>` | Show a specific commit | `git show <commit>` |

### Working with Commits

| Command | Description | Notes |
|---------|-------------|-------|
| `jj new` | Create new empty commit | Freezes current work, starts fresh |
| `jj describe` | Edit commit message | Works on any commit, not just HEAD |
| `jj squash` | Move changes into parent commit | Interactive by default |
| `jj split` | Split commit into multiple | Opens diff editor |
| `jj abandon` | Abandon a commit | Like `git reset`, but safer |

### History Navigation

| Command | Description |
|---------|-------------|
| `jj log` | Show commit tree |
| `jj log -r <revision>` | Show specific revision |
| `jj edit <commit>` | Make a commit the working copy |
| `jj checkout <commit>` | Create new commit based on another |

### Git Interop

| Command | Description | Git Equivalent |
|---------|-------------|----------------|
| `jj git fetch` | Fetch from Git remote | `git fetch` |
| `jj git push` | Push to Git remote | `git push` |
| `jj git clone <url>` | Clone a Git repository | `git clone` |
| `jj git import` | Import changes from Git | Automatic, rarely needed |
| `jj git export` | Export changes to Git | Automatic, rarely needed |

### Advanced Operations

| Command | Description |
|---------|-------------|
| `jj rebase -s <source> -d <dest>` | Move commits around |
| `jj resolve` | Resolve merge conflicts |
| `jj restore --from <rev> <path>` | Restore file from revision |
| `jj obslog` | Show operation history |
| `jj undo` | Undo last operation |

## Bookmarks (jj's Branches)

jj uses **bookmarks** instead of branches:

```bash
# Create a bookmark
jj bookmark create feature-x

# List bookmarks
jj bookmark list

# Move a bookmark to current commit
jj bookmark set feature-x

# Delete a bookmark
jj bookmark delete feature-x

# Push bookmark to Git remote
jj git push --bookmark feature-x
```

**Note:** When working with Git remotes, jj bookmarks map to Git branches.

## Typical Workflows

### Feature Development

```bash
# Start new feature
jj new
jj bookmark create feature-auth
jj describe -m "Add user authentication"

# Make changes...
# Changes are automatically in the commit

# Create another commit for the same feature
jj new
jj describe -m "Add login form"

# Push to remote
jj git push --bookmark feature-auth
```

### Fixing a Typo in Last Commit

```bash
# Make the fix in your editor

# Squash into parent commit
jj squash

# Or describe if you just want to update the message
jj describe -m "Fix typo in commit message"
```

### Working with Git Remotes

```bash
# Fetch latest changes
jj git fetch

# Rebase your work on top of main
jj rebase -d main

# Push your changes
jj git push
```

## Key Advantages Over Git

1. **No staging area** - Changes are immediately tracked
2. **Automatic rebasing** - Descendants update when you edit history
3. **Conflict propagation** - Fix conflicts once, applied downstream
4. **Safe history editing** - Operation log lets you undo anything
5. **Better mental model** - Working copy = commit (always)

## Important Notes

- jj ignores Git's staging area completely
- You can use Git and jj commands interchangeably in the same repo
- jj commits are real Git commits (fully compatible)
- The `.jj/` directory contains jj's metadata, `.git/` contains the actual repo
- `jj git push` and `jj git fetch` keep you synced with Git remotes

## Learn More

- [Official Jujutsu Docs](https://jj-vcs.github.io/jj/latest/)
- [Jujutsu for Git Experts](https://docs.jj-vcs.dev/latest/git-experts/)
- [Git Compatibility Guide](https://jj-vcs.github.io/jj/latest/git-compatibility/)

---

## Sources

- [GitHub - jj-vcs/jj: A Git-compatible VCS that is both simple and powerful](https://github.com/jj-vcs/jj)
- [Jujutsu docs](https://docs.jj-vcs.dev/latest/)
- [Git compatibility - Jujutsu docs](https://jj-vcs.github.io/jj/latest/git-compatibility/)
- [Using Jujutsu in a colocated git repository](https://cuffaro.com/2025-03-15-using-jujutsu-in-a-colocated-git-repository/)
- [Jujutsu for Git experts](https://docs.jj-vcs.dev/latest/git-experts/)
- [The Jujutsu version control system](https://neugierig.org/software/blog/2024/12/jujutsu.html)
