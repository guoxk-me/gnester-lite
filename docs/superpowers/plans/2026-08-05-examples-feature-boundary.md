# Examples and Features Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate removable teaching examples from production business features without changing runtime behavior.

**Architecture:** Move the complete Demo catalog from `src/features` to `src/examples`. Keep `src/features` reserved for production business capabilities, keep reusable mechanisms in `src/platform`, and compose examples conditionally through `AppModule`.

**Tech Stack:** NestJS 11, TypeScript, SWC, Jest, pnpm

## Global Constraints

- Preserve all existing uncommitted work.
- Do not introduce production business features as part of this structural refactor.
- Production must not load examples or discover the Example database migration.
- Examples may depend on platform and contracts; platform and contracts must not depend on examples.
- Do not create a global `utils` or `common` directory.

---

### Task 1: Move the Demo catalog

**Files:**

- Move: `src/features/**` to `src/examples/**`
- Modify: source, test, configuration, and verification imports referencing `src/features`

**Interfaces:**

- Consumes: existing `DemosModule` and all `Demo*` modules
- Produces: the same runtime modules under the `src/examples` ownership boundary

- [x] Move the complete directory without altering file contents.
- [x] Replace source and test import paths from `features` to `examples`.
- [x] Replace runtime and CLI migration globs with `src/examples/demo-database/migrations`.
- [x] Run `pnpm run typecheck`; expect exit code 0.

### Task 2: Enforce the ownership boundary

**Files:**

- Modify: `scripts/verify-architecture.mjs`
- Modify: `docs/architecture.md`
- Modify: `docs/architecture-structure-refactor-summary.md`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`

**Interfaces:**

- Consumes: the source directory structure and compiled Nest module metadata
- Produces: automated checks that reject platform-to-example dependencies and examples in production

- [x] Rename architecture verifier concepts and paths from features to examples where they refer to Demo code.
- [x] Preserve `features` as a production boundary and reject `platform -> features`, `platform -> examples`, and `contracts -> internal layers`.
- [x] Document the production-feature versus removable-example distinction.
- [x] Run `pnpm run build && pnpm run verify:architecture`; expect both commands to exit 0.

### Task 3: Verify behavior and repository consistency

**Files:**

- Verify: all files changed by Tasks 1 and 2

**Interfaces:**

- Consumes: package scripts and architecture contracts
- Produces: fresh evidence that the refactor preserved behavior

- [x] Run `pnpm run format:check`; expect exit code 0.
- [x] Run `pnpm run lint:check`; expect exit code 0.
- [x] Run `pnpm run typecheck`; expect exit code 0.
- [x] Run `pnpm run test`; expect zero failing test suites.
- [x] Run `pnpm run build`; expect exit code 0.
- [x] Run `pnpm run verify:architecture`; expect exit code 0.
- [x] Inspect `git diff --check` and remaining `src/features` references; expect no whitespace errors or Demo ownership references.
