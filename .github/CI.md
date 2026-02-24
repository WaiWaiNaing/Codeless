# Continuous Integration (CI) Setup

This project uses GitHub Actions for continuous integration and automated testing.

## Workflows

### 1. CI (`ci.yml`)
Main continuous integration workflow that runs on every push and pull request.

**Features:**
- Tests on multiple Node.js versions (18.x, 20.x, 22.x)
- Tests on multiple operating systems (Ubuntu, Windows, macOS)
- Runs static analysis checks (`npm run check`)
- Builds the project (`npm run build`)
- Verifies generated files exist and are valid
- Runs test suite

**Triggers:**
- Push to `main`, `master`, or `develop` branches
- Pull requests to `main`, `master`, or `develop` branches

### 2. Release (`release.yml`)
Automated release workflow for publishing to npm.

**Features:**
- Runs all checks and tests
- Builds the project
- Publishes to npm (when a GitHub release is created)

**Triggers:**
- GitHub release creation
- Manual workflow dispatch

**Required Secrets:**
- `NPM_TOKEN`: npm authentication token for publishing

### 3. CodeQL Analysis (`codeql.yml`)
Security analysis using GitHub's CodeQL.

**Features:**
- Static security analysis
- Vulnerability detection
- Runs weekly and on push/PR

**Triggers:**
- Push to `main`, `master`, or `develop` branches
- Pull requests to `main`, `master`, or `develop` branches
- Weekly schedule (Sundays at midnight UTC)

## Setup Instructions

1. **Update Badge URLs in README.md:**
   Replace `YOUR_USERNAME` in the badge URLs with your actual GitHub username or organization name.

2. **Configure npm Token (for releases):**
   - Go to your repository Settings → Secrets and variables → Actions
   - Add a new secret named `NPM_TOKEN`
   - Use your npm authentication token

3. **Branch Names:**
   - Update branch names in workflow files if your default branch is different
   - Common alternatives: `main`, `master`, `develop`, `dev`

## Local Testing

You can test the CI steps locally:

```bash
# Install dependencies
npm ci

# Run static checks
npm run check

# Build project
npm run build

# Run tests
npm test
```

## Workflow Status

Check the Actions tab in your GitHub repository to see workflow runs and their status.
