# Contributing Guide

Thanks for contributing to Social Deduction Game.

## Branching

- Base branch is `main`.
- Create feature branches from `main`:
  - `feat/<short-description>`
  - `fix/<short-description>`
  - `docs/<short-description>`

## Local Setup

```bash
npm install
npm run install:server
npm run install:client
```

## Run Locally

```bash
npm run dev
```

## Test Before Opening a PR

```bash
npm run typecheck --prefix backend
npm run build --prefix backend
npm run test --prefix backend -- --run

npm run build --prefix client
npm run test:e2e --prefix client
```

## Pull Requests

- Use the PR template and keep the scope small.
- Link the issue (if applicable).
- Include test evidence in the PR description.
- Keep PRs rebased on `main`.

## Contributing via GitHub Issues

If you want to pick up an existing issue:

1. Find an open issue (recommended: start with `good first issue`).
2. Comment on the issue that you are taking it.
3. Fork the repository and clone your fork.
4. Create a branch from `main` (example: `fix/issue-17-double-submit-guard`).
5. Implement the change and add/update tests.
6. Run the checks listed in this guide before opening a PR.
7. Push your branch and open a PR to `MohamedAljoke/social-deduction-game:main`.
8. In the PR description, link the issue with a closing keyword like `Closes #17`.
9. Address review feedback and keep the branch up to date until merge.

## CI Expectations

PRs to `main` must pass:

- `backend-tests`
- `client-check`
- `client-e2e`
