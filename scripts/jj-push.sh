#!/bin/bash

# Helper script to push a bookmark to remote with automatic tracking

if [ -z "$1" ]; then
    echo "Usage: ./scripts/jj-push.sh <bookmark-name>"
    echo "Example: ./scripts/jj-push.sh feature/my-feature"
    exit 1
fi

BOOKMARK=$1

echo "Preparing to push bookmark: $BOOKMARK"
echo ""

# Check if bookmark exists
if ! jj bookmark list | grep -q "^$BOOKMARK:"; then
    echo "Error: Bookmark '$BOOKMARK' does not exist"
    echo ""
    echo "Available bookmarks:"
    jj bookmark list
    exit 1
fi

# Move bookmark to current commit
echo "Moving bookmark to current commit..."
jj bookmark set $BOOKMARK

# Track the bookmark on remote (if not already tracked)
echo "Ensuring bookmark is tracked on remote..."
jj bookmark track $BOOKMARK --remote=origin 2>/dev/null || true

# Push to remote
echo "Pushing to remote..."
jj git push --bookmark $BOOKMARK

echo ""
echo "✓ Successfully pushed $BOOKMARK to remote!"
