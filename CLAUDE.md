# CLAUDE.md

This file provides guidance to AI assistants (Claude and others) working in this repository.

## Repository Overview

**Project:** groceries
**Owner:** greg-incogneato
**Status:** New project — repository was freshly initialized. No application code exists yet.

The repository currently contains only a `.gitkeep` placeholder. All conventions below should be followed as the project grows.

## Repository Structure

```
groceries/
├── .gitkeep          # Placeholder to track empty repository
└── CLAUDE.md         # This file
```

As the project develops, this section should be updated to reflect the actual directory layout and purpose of each component.

## Development Workflow

### Branching

- **Main branch:** `main`
- **Feature branches:** `claude/<short-description>-<session-id>` (for AI-driven changes)
- **Human feature branches:** use descriptive names, e.g., `feature/add-shopping-list`
- Never push directly to `main` without a pull request.

### Making Changes

1. Check out or create the appropriate branch.
2. Make focused, minimal changes — avoid unrelated edits in the same commit.
3. Commit with a clear, imperative message (e.g., `Add shopping list API endpoint`).
4. Push with: `git push -u origin <branch-name>`
5. Open a pull request targeting `main`.

### Commit Messages

Follow the imperative style:
- `Add <feature>`
- `Fix <bug>`
- `Update <component>`
- `Remove <thing>`

Keep the subject line under 72 characters. Add a body if the reason behind a change isn't self-evident.

## Code Conventions

Because no application code exists yet, specific language/framework conventions are not established. When the project's tech stack is chosen, update this section with:

- Language and runtime versions
- Formatter / linter commands
- Test runner command
- Build command

### General Principles (apply regardless of stack)

- Prefer simple, readable code over clever one-liners.
- Avoid over-engineering — implement what is needed now, not hypothetical future requirements.
- Validate only at system boundaries (user input, external API responses); trust internal code.
- Do not add comments unless the logic is non-obvious.

## Testing

No test suite is configured yet. When tests are added, document here:

- How to run the full test suite
- How to run a single test
- Minimum coverage requirements (if any)

## Key Decisions & Context

- Repository was initialized on 2026-02-01.
- No framework, language, or architecture has been chosen yet.
- Update this file whenever significant architectural or tooling decisions are made.
