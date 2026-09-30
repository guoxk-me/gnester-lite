> Historical document. Current architecture and commands are defined in ../architecture.md and ../../README.md.

# NestJS 12 migration

`v11` retains the verified NestJS 11 service. `master` was rebuilt from the NestJS 12 CLI scaffold, then production capabilities, examples, tests, and deployment tooling were restored in separate commits. Both branches remain active. Transfer shared fixes with reviewed cherry-picks because the build and test layouts differ.

## Runtime and tooling

- Node.js 24 and pnpm 11.1.2 remain required.
- NestJS 12 uses native ESM (`"type": "module"`, TypeScript `nodenext`) and the TypeScript builder. Local TypeScript imports name their emitted `.js` files.
- Vitest 4 replaces Jest for unit, HTTP/WebSocket e2e, and guarded full-app integration. `oxlint --type-aware` replaces ESLint. The build emits `dist/src/` with YAML and locale assets.
- Swagger DTO metadata is emitted into compiled classes. OpenAPI contract verification scans the compiled ESM artifact.

## Database continuity

The rebuild changes the code baseline, not the production database. The existing TypeORM migration classes and names remain stable. `src/database/migrations/` is production-visible; the Demo migration stays under `src/examples/demo-database/migrations/` and is discovered only outside production. Production keeps `DB_SYNCHRONIZE=false` and still requires an explicit migration deployment before application startup.

Development migration commands compile first and run TypeORM against `dist/src/config/typeorm.data-source.js`, preserving decorator metadata. `migration:create` writes an empty source migration; `migration:generate` accepts a source path and compares the compiled DataSource to the selected database. Review generated SQL before applying it.

The guarded `verify:migrations`, `test:full-app`, and `verify:production-start` commands require `GNESTER_ALLOW_DESTRUCTIVE_INTEGRATION=true`, loopback MySQL and Redis, and a database name ending in `_test`, `-test`, `_ci`, or `-ci`. Never aim these at production infrastructure.

## Verification

Run the CI sequence in `.github/workflows/ci.yml`. It checks formatting, type-aware lint, strict TypeScript, coverage, architecture, compiled assets, OpenAPI, Docker image, e2e, migration round trip, full-app integration, production startup, and dependency audit. Infrastructure checks need disposable MySQL 8 and Redis 7.
