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

## CI Expectations

PRs to `main` must pass:

- `backend-tests`
- `client-check`
- `client-e2e`

