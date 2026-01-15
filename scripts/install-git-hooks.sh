#!/bin/bash

# Script to install git hooks for automatic SESSION_MEMORY.md updates
# Run this once after cloning the repository

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$REPO_ROOT" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

cd "$REPO_ROOT" || exit 1

HOOK_FILE=".git/hooks/pre-commit"
HOOK_CONTENT='#!/bin/bash

# Git pre-commit hook to automatically update SESSION_MEMORY.md
# This ensures the memory file is always up-to-date with commit information

# Get the repository root directory
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT" || exit 1

# Run the update script
./scripts/update-memory.sh

# Exit with the script's exit code
exit $?
'

echo "🔧 Installing git pre-commit hook..."

# Create the hook file
echo "$HOOK_CONTENT" > "$HOOK_FILE"
chmod +x "$HOOK_FILE"

echo "✅ Git pre-commit hook installed successfully!"
echo ""
echo "The hook will automatically:"
echo "  - Update SESSION_MEMORY.md with current commit info"
echo "  - Add the memory file to each commit"
echo ""
echo "To test, make a small change and commit it."
echo "The memory file will be updated automatically."











