# Creating PR to Upstream - Quick Start Guide

This document provides a quick reference for creating a Pull Request from this fork to the upstream repository.

## Current Repository Status

- **Fork (Origin)**: https://github.com/jhegedus42/chickenloop
- **Upstream Repository**: https://github.com/chickenloop3845-commits/chickenloop
- **Branch with changes**: `main`
- **Target branch**: upstream `main`

## What's Ready to Submit

Check what changes are in your `main` branch:

```bash
# View commits that will be included in the PR
git log upstream/main..main --oneline
```

This will show you all commits in your main branch that aren't in upstream/main yet.

## Quick Start: Create the PR

### Option 1: Use the Helper Script (Recommended)

```bash
# Switch to main branch
git checkout main

# Run the helper script
./create-upstream-pr.sh

# Follow the prompts
```

The script will:
1. Check your current branch
2. Fetch latest changes from upstream
3. Show you how many commits ahead/behind you are
4. Push your changes to origin
5. Provide you with a direct link to create the PR on GitHub

### Option 2: Manual PR Creation via GitHub UI

1. **Push main branch to origin** (if not already pushed):
   ```bash
   git checkout main
   git push origin main
   ```

2. **Open the PR creation URL**:
   
   Click this link:
   ```
   https://github.com/chickenloop3845-commits/chickenloop/compare/main...jhegedus42:chickenloop:main
   ```

3. **Fill in the PR details**:
   - **Title**: Use a clear, descriptive title for your changes
   - **Description**: 
     ```
     Provide a detailed description of your changes:
     
     - What problem does this solve?
     - What changes did you make?
     - Any additional context or considerations?
     ```

4. **Submit the PR**:
   - Review the changes shown
   - Click "Create pull request"

## Verification

Before creating the PR, verify:

```bash
# Check that you're on the main branch
git branch --show-current

# View the commits that will be included in the PR
git log upstream/main..main --oneline

# This will show you all your commits that aren't in upstream yet
```

## After Creating the PR

1. Wait for upstream maintainers to review
2. Address any feedback or requested changes
3. Keep your fork synchronized with upstream:
   ```bash
   git fetch upstream
   git merge upstream/main
   ```

## Need Help?

- See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines
- Check the upstream repository for additional contribution requirements
- Contact the upstream maintainers if you have questions

---

**Note**: This guide was created as part of the automated process to facilitate contributing changes from this fork back to the upstream repository.
