# Contributing to Auth UI

Thank you for your interest in contributing to Auth UI. We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/getauthui.git
   cd getauthui
   ```
3. **Install** dependencies:
   ```bash
   npm install -g pnpm
   pnpm install
   ```

## Development Setup

This is a pnpm monorepo. The library lives in `packages/core` (`@getauthui/core`). Docs are a Next.js + Fumadocs static site in `docs`. The Vite playground is in `example`.

```bash
# Typecheck the library
pnpm check

# Run unit tests (vitest + jsdom, Appwrite mocked)
pnpm test

# Build the library (ESM + d.ts, CDN ESM + IIFE)
pnpm build

# Docs site (http://localhost:3100)
pnpm dev:docs

# Library watch build
pnpm dev:core

# Example playground (http://localhost:5174)
pnpm --filter example dev

# Format and lint
pnpm format:check
pnpm lint
```

### Project Structure

```
getauthui/
├── packages/
│   └── core/           # @getauthui/core Lit web components
│       ├── src/        # Source files
│       └── test/       # Tests
├── docs/               # Landing page and documentation
├── example/            # Vite playground
└── skills/             # Agent Skills (authui-creator)
```

## How to Contribute

### Reporting Bugs

Before submitting a bug report, please:

1. Check the [existing issues](https://github.com/Meldiron/getauthui/issues) to avoid duplicates
2. Include a minimal reproducible example (endpoint, project setup, and the HTML or React snippet)
3. Note browser, Appwrite SDK / Cloud version, and whether you used the CDN ESM or IIFE build

### Requesting Features

1. Check the [existing issues](https://github.com/Meldiron/getauthui/issues) for similar requests
2. Open an issue describing the use case and why it belongs in Auth UI
3. Keep the product model in mind: drop-in components on the developer's origin, with the Appwrite SDK owning the session

### Submitting Changes

1. Create a **new branch** from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. Make your changes
3. Write or update tests as needed (`packages/core/test`)
4. Update docs under `docs/content/docs` when you change public API or components
5. Ensure all checks pass locally before pushing:
   ```bash
   pnpm format:check
   pnpm lint
   pnpm check
   pnpm test
   pnpm build
   ```
6. Commit your changes (see [Commit Messages](#commit-messages))
7. Push to your fork and open a Pull Request

If you bump `@getauthui/core`, run `pnpm sync:cdn-pins` so homepage, docs, README, and skill pins stay aligned. Do not hand-edit CDN pins in isolation.

## Pull Request Process

1. **Target `main`** for all pull requests
2. **Describe the change** and link related issues (`Closes #123`)
3. **Ensure CI / local gates pass** : format, lint, typecheck, tests, and build
4. **Request a review** : maintainers will review when they can
5. **Address feedback** : respond to comments and push updates
6. **Squash commits** if requested before merging

PRs that do not pass checks or lack tests for new library behavior will not be merged.

## Coding Standards

- **Language**: TypeScript for library source (`.ts`)
- **UI strings**: Every user-facing string goes through `t()` with a key in `types.ts` (`AuthUIStrings`) and a default in `i18n.ts`
- **Errors**: Map Appwrite errors the UI can trigger in `errors.ts`. Fall back to the server message, never to a blank state
- **Sessions**: The Appwrite SDK owns the session. Do not read, store, or forward `cookieFallback`, JWTs, or session secrets
- **Design**: Reuse Console tokens and shared classes in `packages/core/src/styles`. Do not invent new colours
- **Copy**: No em dashes. Use a period, comma, colon, or parentheses
- **Tests**: New features need tests; bug fixes should include a regression test when practical
- **Compatibility**: Prefer the `call(target, [newName, oldName], args)` helper in `store.ts` for Appwrite methods renamed across SDK versions

See [AGENTS.md](./AGENTS.md) for fuller product and publishing guidelines.

### CI Checks

Run these locally before pushing:

1. **Format check** : `pnpm format:check` (Prettier)
2. **Lint** : `pnpm lint` (ESLint)
3. **Typecheck** : `pnpm check`
4. **Test** : `pnpm test`
5. **Build** : `pnpm build`

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:**

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `chore`: Maintenance tasks (deps, build, config, release)
- `perf`: Performance improvements

**Examples:**

```
feat(core): surface MFA enrollment hints in the account panel
fix(sign-in): keep recovery codes readable after enrollment
docs: add contributing guide and code of conduct
```

## Questions?

Open an [issue](https://github.com/Meldiron/getauthui/issues) for questions that are not bug reports or feature requests.
