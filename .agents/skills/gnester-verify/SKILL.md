---
name: gnester-verify
description: Select and run verification for gnester-lite code changes or a full CI readiness check.
---

# Verify gnester-lite changes

Use `package.json` for current command names and `.github/workflows/ci.yml` for
the authoritative full CI sequence. Choose checks based on the changed behavior;
report exactly which commands ran and which did not.

1. Inspect `git status --short` and the relevant diff so existing user changes
   are accounted for before running checks that write files.
2. For ordinary TypeScript changes, run `pnpm run format:check`,
   `pnpm run lint:check`, `pnpm run typecheck`, focused unit tests, and
   `pnpm run build` when the change affects compilation or runtime assembly.
   Use `pnpm run test -- path/to/file.spec.ts` for a focused unit test.
3. Add the checks owned by the affected boundary: `verify:architecture` for
   module imports, `verify:openapi` for API contracts, and `verify:artifact`
   after a build when runtime output changes. Check other CI steps when their
   corresponding behavior changes.
4. For a full CI readiness run, follow `.github/workflows/ci.yml` in order.
   Its MySQL, Redis, Docker, and secret setup are part of that run.

`verify:migrations`, `test:full-app`, and `verify:production-start` affect
infrastructure. Run them only against disposable local or CI services after
checking `scripts/run-destructive-integration.mjs` and the required environment.
Never point them at production data. Database schema changes and production data
operations still require the confirmation specified in `AGENTS.md`.
