# Testing

StudyFlow AI is covered by two layers of automated tests, wired into CI on
every push and pull request to `main` (`.github/workflows/ci.yml`).

## Unit tests — Vitest

Fast, deterministic tests for the pure business logic (no DB, no network):

- `tests/unit/focus.test.ts` — XP/levelling, achievement evaluation, streak
  calculation (with mocked system time), daily-series building, and formatters.
- `tests/unit/validations.test.ts` — the Zod schemas for auth, tasks and rooms.

```bash
npm test            # watch mode
npm run test:run    # single run (CI)
npm run test:coverage
```

Coverage is scoped to `lib/focus.ts` and `lib/validations.ts` (see
`vitest.config.ts`).

## End-to-end tests — Playwright

Browser smoke tests for the public, credential-free routes:

- `tests/e2e/landing.spec.ts` — landing page renders its hero + CTAs and routes
  to the sign-in page.

```bash
npx playwright install chromium   # one-time
npm run test:e2e
```

The Playwright config (`playwright.config.ts`) boots `npm run dev` automatically
via its `webServer` block, so no manual server start is needed.

## Continuous integration

`CI` runs two jobs in parallel:

1. **quality** — `lint`, `typecheck`, and unit tests with coverage.
2. **e2e** — installs Chromium and runs the Playwright suite; the HTML report is
   uploaded as a build artifact.
