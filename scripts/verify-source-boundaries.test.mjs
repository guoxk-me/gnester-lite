import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectSourceBoundary } from './verify-source-boundaries.mjs';

// AI modified: regression cases enforce ownership through runtime imports, type queries and public identity entry points.
test('common cannot depend on infrastructure through erased types or dynamic imports', () => {
  for (const source of [
    "import type { Key } from '../../infra/crypto/key.types.js'",
    "type Key = import('../../infra/crypto/key.types.js').Key",
    "const crypto = import('../../infra/crypto/crypto.module.js')",
    "export type { Key } from '../../infra/crypto/key.types.js'",
  ])
    assert.ok(inspectSourceBoundary('common/http/protocol.ts', source).length);
});
test('business types stay local and public identity access is explicit', () => {
  assert.deepEqual(
    inspectSourceBoundary(
      'modules/assistant/assistant.service.ts',
      "import type { Conversation } from './conversation.types.js'; interface LocalQuery {}",
    ),
    [],
  );
  assert.ok(
    inspectSourceBoundary(
      'modules/assistant/assistant.service.ts',
      "import type { SessionRow } from '../identity/session-persistence.types.js'",
    ).length,
  );
  assert.ok(
    inspectSourceBoundary(
      'modules/assistant/assistant.service.ts',
      "import { ApplicationAuthService } from '../identity/application-auth.service.js'",
    ).length,
  );
  for (const source of [
    "import { IdentityModule } from '../identity/identity.module.js'",
    "import { SessionAuthGuard } from '../identity/session-auth.guard.js'",
    "import type { SessionUser } from '../identity/session.types.js'",
  ])
    assert.deepEqual(
      inspectSourceBoundary('modules/assistant/assistant.module.ts', source),
      [],
    );
});
test('infrastructure cannot reach business or bootstrap', () => {
  assert.ok(
    inspectSourceBoundary(
      'infra/cache/cache.service.ts',
      "import { IdentityModule } from '../../modules/identity/identity.module.js'",
    ).length,
  );
  assert.ok(
    inspectSourceBoundary(
      'infra/cache/cache.service.ts',
      "import { configureApplication } from '../../bootstrap/configure-application.js'",
    ).length,
  );
  assert.deepEqual(
    inspectSourceBoundary(
      'infra/health/health.controller.ts',
      "import { SkipApiEnvelope } from '../../common/http/skip-api-envelope.decorator.js'",
    ),
    [],
  );
});
test('aliases use the same ownership rules and retired layers cannot return', () => {
  assert.ok(
    inspectSourceBoundary(
      'infra/cache/cache.service.ts',
      "import { IdentityModule } from '#identity'",
      () => 'modules/identity/identity.module.ts',
    ).length,
  );
  assert.ok(
    inspectSourceBoundary(
      'types/auth/session.ts',
      'export interface Session {}',
    ).length,
  );
  assert.ok(
    inspectSourceBoundary('examples/example.ts', 'export class Example {}')
      .length,
  );
  assert.ok(
    inspectSourceBoundary(
      'config/database.ts',
      "export { DatabaseModule } from '../infra/database/database.module.js'",
    ).length,
  );
});

// AI modified: exercise real tsconfig alias resolution and erased cycles rather than only injecting a resolver stub.
test('project resolution detects aliases and type-only cycles', async () => {
  const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { verifySourceBoundaries } =
    await import('./verify-source-boundaries.mjs');
  const root = await mkdtemp(join(tmpdir(), 'gnester-boundary-'));
  try {
    await mkdir(join(root, 'src/infra/cache'), { recursive: true });
    await mkdir(join(root, 'src/modules/identity'), { recursive: true });
    await writeFile(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'nodenext',
          moduleResolution: 'nodenext',
          paths: { '#identity': ['./src/modules/identity/session.types.ts'] },
        },
      }),
    );
    await writeFile(
      join(root, 'src/modules/identity/session.types.ts'),
      'export interface Session {}',
    );
    await writeFile(
      join(root, 'src/infra/cache/cache.types.ts'),
      "import type { Session } from '#identity'; export interface Cache { session: Session }",
    );
    assert.ok(
      (await verifySourceBoundaries(root)).some((violation) =>
        violation.includes('infrastructure depends on application code'),
      ),
    );
    await mkdir(join(root, 'test'), { recursive: true });
    await writeFile(
      join(root, 'test/fixture.types.ts'),
      'export interface Fixture {}',
    );
    await writeFile(
      join(root, 'src/infra/cache/cache.types.ts'),
      "import type { Fixture } from '../../../test/fixture.types.js'; export interface Cache { fixture: Fixture }",
    );
    assert.ok(
      (await verifySourceBoundaries(root)).some((violation) =>
        violation.includes('dependency escapes source ownership'),
      ),
    );
    await writeFile(
      join(root, 'src/infra/cache/cache.types.ts'),
      "import type { Other } from './other.types.js'; export interface Cache { other: Other }",
    );
    await writeFile(
      join(root, 'src/infra/cache/other.types.ts'),
      "import type { Cache } from './cache.types.js'; export interface Other { cache: Cache }",
    );
    assert.ok(
      (await verifySourceBoundaries(root)).some((violation) =>
        violation.includes('circular source dependency'),
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
