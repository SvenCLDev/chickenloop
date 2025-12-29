# Contributing to ChickenLoop

Thank you for your interest in contributing to ChickenLoop! This document provides guidelines for contributing to the upstream repository.

## Repository Structure

This repository is a fork of the upstream repository:
- **Upstream**: https://github.com/chickenloop3845-commits/chickenloop
- **Fork**: https://github.com/jhegedus42/chickenloop

## How to Contribute

### Setting Up Your Environment

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/jhegedus42/chickenloop.git
   cd chickenloop
   ```

2. **Add upstream remote** (if not already configured):
   ```bash
   git remote add upstream https://github.com/chickenloop3845-commits/chickenloop.git
   git fetch upstream
   ```

3. **Verify remotes**:
   ```bash
   git remote -v
   ```
   You should see:
   - `origin` pointing to your fork (jhegedus42/chickenloop)
   - `upstream` pointing to the main repository (chickenloop3845-commits/chickenloop)

### Creating a Pull Request to Upstream

#### Method 1: Using the Helper Script

We provide a helper script to streamline the PR creation process:

```bash
./create-upstream-pr.sh
```

This script will:
- Check that you're on the main branch
- Ensure your branch is up to date with upstream
- Push your changes to origin
- Provide a link to create the PR on GitHub

#### Method 2: Manual Process

1. **Ensure your main branch is up to date**:
   ```bash
   git checkout main
   git fetch upstream
   git merge upstream/main
   ```

2. **Make your changes** (if not already done):
   ```bash
   # Make your code changes
   git add .
   git commit -m "Your descriptive commit message"
   ```

3. **Push to your fork**:
   ```bash
   git push origin main
   ```

4. **Create the Pull Request**:
   - Go to https://github.com/chickenloop3845-commits/chickenloop
   - Click on "Pull requests" → "New pull request"
   - Click "compare across forks"
   - Set:
     - **base repository**: chickenloop3845-commits/chickenloop
     - **base branch**: main
     - **head repository**: jhegedus42/chickenloop
     - **compare branch**: main
   - Click "Create pull request"
   - Fill in the PR title and description
   - Submit the pull request

### Working with Feature Branches

For larger contributions, it's recommended to work on feature branches:

```bash
# Create a feature branch from main
git checkout main
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Implement your feature"

# Push to your fork
git push origin feature/your-feature-name

# Create PR from your feature branch to upstream main
```

### Pull Request Guidelines

- **Write clear commit messages**: Use descriptive commit messages that explain what and why
- **Keep PRs focused**: Each PR should address a single concern or feature
- **Update documentation**: If you change functionality, update relevant documentation
- **Test your changes**: Ensure all tests pass before submitting
- **Follow code style**: Match the existing code style in the project

### Code Quality Checks

Before submitting a PR, ensure:

1. **Build succeeds**:
   ```bash
   npm run build
   ```

2. **Tests pass** (if applicable):
   ```bash
   npm test
   ```

3. **Linting passes**:
   ```bash
   npm run lint
   ```

### Getting Help

If you need help with the contribution process:
- Check existing issues and PRs for similar discussions
- Review the main README.md for project documentation
- Reach out to the maintainers

## Code of Conduct

Please be respectful and constructive in all interactions. We aim to create a welcoming environment for all contributors.

## License

By contributing to ChickenLoop, you agree that your contributions will be licensed under the same license as the project (MIT License).
