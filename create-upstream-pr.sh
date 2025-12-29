#!/bin/bash

# Script to help create a Pull Request from this fork to the upstream repository
# Usage: ./create-upstream-pr.sh

set -e

UPSTREAM_REPO="chickenloop3845-commits/chickenloop"
FORK_REPO="jhegedus42/chickenloop"
BRANCH="main"

echo "================================================"
echo "ChickenLoop - Upstream PR Helper Script"
echo "================================================"
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check if upstream remote exists
if ! git remote | grep -q "^upstream$"; then
    echo "⚠️  Upstream remote not found. Adding it now..."
    git remote add upstream "https://github.com/${UPSTREAM_REPO}.git"
    echo "✅ Upstream remote added"
else
    echo "✅ Upstream remote found"
fi

# Fetch latest from upstream
echo ""
echo "📥 Fetching latest changes from upstream..."
git fetch upstream

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo ""
echo "📍 Current branch: $CURRENT_BRANCH"

# If not on main, ask to switch
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    echo ""
    read -p "⚠️  You're not on the '$BRANCH' branch. Switch to it? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout "$BRANCH"
        echo "✅ Switched to $BRANCH branch"
    else
        echo "❌ Staying on $CURRENT_BRANCH. You may want to create a PR from this branch instead."
        BRANCH="$CURRENT_BRANCH"
    fi
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo ""
    echo "⚠️  You have uncommitted changes. Please commit or stash them first."
    git status --short
    exit 1
fi

# Show comparison with upstream
echo ""
echo "📊 Comparing your branch with upstream/main..."
AHEAD=$(git rev-list --count upstream/main.."$BRANCH" 2>/dev/null || echo "0")
BEHIND=$(git rev-list --count "$BRANCH"..upstream/main 2>/dev/null || echo "0")

echo "   Your branch is $AHEAD commit(s) ahead of upstream/main"
echo "   Your branch is $BEHIND commit(s) behind upstream/main"

if [ "$AHEAD" -eq 0 ]; then
    echo ""
    echo "⚠️  Your branch has no new commits compared to upstream/main"
    echo "   There's nothing to create a PR for."
    exit 0
fi

# Ask if user wants to sync with upstream first
if [ "$BEHIND" -gt 0 ]; then
    echo ""
    read -p "⚠️  Your branch is behind upstream. Merge upstream changes first? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git merge upstream/main
        echo "✅ Merged upstream/main into your branch"
    fi
fi

# Push to origin
echo ""
read -p "📤 Push your changes to origin/$BRANCH? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin "$BRANCH"
    echo "✅ Pushed to origin/$BRANCH"
else
    echo "⚠️  Skipped push. You'll need to push manually before creating the PR."
fi

# Provide PR creation link
echo ""
echo "================================================"
echo "🎉 Ready to create Pull Request!"
echo "================================================"
echo ""
echo "Open this URL in your browser to create the PR:"
echo ""
echo "https://github.com/${UPSTREAM_REPO}/compare/main...${FORK_REPO}:${BRANCH}"
echo ""
echo "This will create a PR from:"
echo "  📤 Source: ${FORK_REPO}:${BRANCH}"
echo "  📥 Target: ${UPSTREAM_REPO}:main"
echo ""
echo "After opening the link:"
echo "  1. Review the changes"
echo "  2. Add a descriptive title"
echo "  3. Write a detailed description"
echo "  4. Click 'Create pull request'"
echo ""
echo "================================================"

exit 0