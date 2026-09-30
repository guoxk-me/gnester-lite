import { spawn } from 'node:child_process';
import { randomBytes, randomUUID, scrypt } from 'node:crypto';
import { createServer } from 'node:net';
import { promisify } from 'node:util';
import { createConnection } from 'mysql2/promise';
import { assertDisposableInfrastructure } from './run-destructive-integration.mjs';
import { PRODUCTION_SHUTDOWN_TIMEOUT_MS } from './verify-shutdown-contract.mjs';

const STARTUP_TIMEOUT_MS = 30_000;
const DRAINING_PROBE_TIMEOUT_MS = 2_000;
const PROBE_INTERVAL_MS = 100;

// AI modified: retain the destructive safety gate even when this inner verifier is invoked directly.
assertDisposableInfrastructure(process.env);

const port = await reserveLoopbackPort();
const smokeEmail = `production-smoke-${process.pid}-${Date.now()}@example.com`;
const applicationProcess = spawn(process.execPath, ['dist/src/main.js'], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    CORS_ORIGINS: 'https://auth-smoke.example.com',
  },
  stdio: 'inherit',
});
let hasApplicationExited = false;
let applicationExit;
let smokeUserId;

applicationProcess.once('exit', (code, signal) => {
  hasApplicationExited = true;
  applicationExit = { code, signal };
});

let verificationError;

try {
  // AI modified: exercise the emitted production entry instead of repeating its bootstrap steps in a test module.
  await waitForHealthyApplication(port);
  // AI modified: production smoke locks both the envelope shape and weighted language negotiation.
  await expectApiEnvelopeResponse(
    `http://127.0.0.1:${port}/v1`,
    'Success',
    'Hello World!',
  );
  await expectApiEnvelopeResponse(
    `http://127.0.0.1:${port}/v1`,
    '成功',
    '你好，世界！',
    'zh-CN, zh;q=0.9, en;q=0.8',
  );
  // AI modified: keep readiness probes outside the login route's one-second rate budget.
  await new Promise((resolve) => setTimeout(resolve, 1_100));
  // AI modified: production smoke verifies the application-owned access and refresh cookies.
  await verifyApplicationSession(port, smokeEmail, (createdUserId) => {
    // AI modified: retain the exact smoke-owned record ID so cleanup cannot delete a pre-existing user after an email collision.
    smokeUserId = createdUserId;
  });

  applicationProcess.kill('SIGTERM');
  // AI modified: prove the process becomes unready while remaining live during traffic propagation.
  await waitForDrainingApplication(port);
  const gracefulExit = await waitForProcessExit(
    applicationProcess,
    PRODUCTION_SHUTDOWN_TIMEOUT_MS,
  );

  if (gracefulExit.code !== 143 || gracefulExit.signal !== null) {
    throw new Error(
      `Production entry did not complete the SIGTERM shutdown contract (code ${String(gracefulExit.code)}, signal ${String(gracefulExit.signal)}).`,
    );
  }

  process.stdout.write(
    'Production entry passed health and application session probes, then shut down cleanly.\n',
  );
} catch (error) {
  verificationError = error;
}

const cleanupErrors = [];

try {
  if (!hasApplicationExited) {
    applicationProcess.kill('SIGTERM');

    try {
      await waitForProcessExit(
        applicationProcess,
        PRODUCTION_SHUTDOWN_TIMEOUT_MS,
      );
    } catch {
      applicationProcess.kill('SIGKILL');
      await waitForProcessExit(
        applicationProcess,
        PRODUCTION_SHUTDOWN_TIMEOUT_MS,
      );
    }
  }
} catch (error) {
  cleanupErrors.push(error);
}

if (smokeUserId) {
  try {
    await removeSmokeUser(smokeUserId, smokeEmail);
  } catch (error) {
    cleanupErrors.push(error);
  }
}

if (verificationError && cleanupErrors.length > 0) {
  throw new AggregateError(
    [verificationError, ...cleanupErrors],
    'Production verification and cleanup both failed.',
  );
}

if (verificationError) {
  throw verificationError;
}

if (cleanupErrors.length > 0) {
  throw new AggregateError(cleanupErrors, 'Production cleanup failed.');
}

async function verifyApplicationSession(
  applicationPort,
  email,
  recordCreatedUser,
) {
  const baseURL = 'http://127.0.0.1:' + applicationPort + '/api/session';
  const password = 'Application-Smoke-' + Date.now() + '!';
  const origin = 'https://auth-smoke.example.com';
  const createdUserId = await createSmokeUser(email, password);
  recordCreatedUser(createdUserId);

  // AI modified: the session check issues XSRF before any credential-bearing mutation.
  const initial = await fetch(baseURL, {
    headers: { origin },
    signal: AbortSignal.timeout(5_000),
  });
  await expectApplicationResponse(initial, 401, 'anonymous session');
  const cookies = new Map();
  collectCookies(initial, cookies);
  let csrf = decodeURIComponent(cookies.get('XSRF-TOKEN') ?? '');
  if (!csrf || !cookies.has('__Host-gnester.csrf-id')) {
    throw new Error('Session check did not issue both CSRF cookies.');
  }

  const requestHeaders = () => ({
    'content-type': 'application/json',
    origin,
    cookie: [...cookies].map(([name, token]) => name + '=' + token).join('; '),
    'x-xsrf-token': csrf,
  });
  const signedIn = await fetch(baseURL + '/login', {
    method: 'POST',
    headers: requestHeaders(),
    body: JSON.stringify({ email, password, rememberMe: true }),
    signal: AbortSignal.timeout(5_000),
  });
  const signedInBody = await expectApplicationResponse(signedIn, 200, 'login');
  if (signedInBody.data?.id !== createdUserId) {
    throw new Error('Application login returned an unexpected user.');
  }
  expectSecureAuthCookies(signedIn, 'login');
  collectCookies(signedIn, cookies);
  const originalRefresh = cookies.get('gvueter_refresh');
  if (!originalRefresh || !cookies.get('gvueter_access')) {
    throw new Error(
      'Application login did not set both authentication cookies.',
    );
  }

  const active = await fetch(baseURL, {
    headers: requestHeaders(),
    signal: AbortSignal.timeout(5_000),
  });
  const activeBody = await expectApplicationResponse(
    active,
    200,
    'active session',
  );
  if (activeBody.data?.email !== email) {
    throw new Error(
      'Application session did not resolve the signed-in account.',
    );
  }
  collectCookies(active, cookies);
  csrf = decodeURIComponent(cookies.get('XSRF-TOKEN') ?? '');
  await new Promise((resolve) => setTimeout(resolve, 1_100));

  const renewed = await fetch(baseURL + '/refresh', {
    method: 'POST',
    headers: requestHeaders(),
    body: '{}',
    signal: AbortSignal.timeout(5_000),
  });
  await expectApplicationResponse(renewed, 200, 'refresh');
  expectSecureAuthCookies(renewed, 'refresh');
  collectCookies(renewed, cookies);
  if (cookies.get('gvueter_refresh') === originalRefresh) {
    throw new Error('Refresh did not rotate the refresh token.');
  }

  const revoked = await fetch(baseURL + '/logout', {
    method: 'POST',
    headers: requestHeaders(),
    body: '{}',
    signal: AbortSignal.timeout(5_000),
  });
  const revokedBody = await expectApplicationResponse(revoked, 200, 'logout');
  if (revokedBody.data !== null) {
    throw new Error('Logout did not return an empty application payload.');
  }
  for (const name of ['gvueter_access', 'gvueter_refresh']) {
    const cleared = revoked.headers.getSetCookie().some((cookie) => {
      if (!cookie.startsWith(name + '=;')) return false;
      const expires = /;\s*Expires=([^;]+)/i.exec(cookie)?.[1];
      return Boolean(expires && Date.parse(expires) < Date.now());
    });
    if (!cleared) throw new Error('Logout did not clear ' + name + '.');
  }
  const oldAccess = await fetch(baseURL, {
    headers: requestHeaders(),
    signal: AbortSignal.timeout(5_000),
  });
  await expectApplicationResponse(oldAccess, 401, 'revoked session');
}

async function expectApplicationResponse(response, status, operation) {
  const responseText = await response.text();
  if (response.status !== status) {
    throw new Error(
      operation + ' failed with ' + response.status + ': ' + responseText,
    );
  }
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(operation + ' did not return JSON.');
  }
  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(operation + ' did not return JSON.');
  }
}

function collectCookies(response, cookies) {
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(';', 1);
    const separator = pair?.indexOf('=');
    if (separator > 0)
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

function expectSecureAuthCookies(response, operation) {
  for (const name of ['gvueter_access', 'gvueter_refresh']) {
    const cookie = response.headers
      .getSetCookie()
      .find((entry) => entry.startsWith(name + '='));
    if (
      !cookie ||
      !/;\s*Secure(?:;|$)/i.test(cookie) ||
      !/;\s*HttpOnly(?:;|$)/i.test(cookie)
    ) {
      throw new Error(
        operation + ' did not set a Secure HttpOnly ' + name + ' cookie.',
      );
    }
  }
}

async function createSmokeUser(email, password) {
  const connection = await createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  const userId = randomUUID();
  try {
    await connection.beginTransaction();
    const salt = randomBytes(16).toString('base64url');
    const passwordKey = await promisify(scrypt)(password, salt, 64);
    const passwordHash = `scrypt$${salt}$${passwordKey.toString('base64url')}`;
    await connection.execute(
      'INSERT INTO `user` (`id`, `name`, `email`, `emailVerified`, `role`, `banned`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, false, ?, false, NOW(3), NOW(3))',
      [userId, 'Production Smoke User', email, 'user'],
    );
    await connection.execute(
      'INSERT INTO `account` (`id`, `accountId`, `providerId`, `userId`, `password`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3))',
      [randomUUID(), userId, 'credential', userId, passwordHash],
    );
    await connection.commit();
    return userId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

async function removeSmokeUser(userId, email) {
  const connection = await createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    const deletionErrors = [];

    for (const [sql, parameters] of [
      ['DELETE FROM `verification` WHERE `identifier` = ?', [email]],
      ['DELETE FROM `user` WHERE `id` = ?', [userId]],
    ]) {
      try {
        await connection.execute(sql, parameters);
      } catch (error) {
        deletionErrors.push(error);
      }
    }

    if (deletionErrors.length > 0) {
      throw new AggregateError(
        deletionErrors,
        'Could not remove every application session smoke record.',
      );
    }
  } finally {
    await connection.end();
  }
}

async function reserveLoopbackPort() {
  const reservation = createServer();

  await new Promise((resolve, reject) => {
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', resolve);
  });

  const address = reservation.address();

  if (!address || typeof address === 'string') {
    reservation.close();
    throw new Error(
      'Could not reserve a TCP port for production verification.',
    );
  }

  await new Promise((resolve, reject) => {
    reservation.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  return address.port;
}

async function waitForHealthyApplication(applicationPort) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (hasApplicationExited) {
      throw new Error(
        `Production entry exited before becoming healthy (code ${String(applicationExit?.code)}, signal ${String(applicationExit?.signal)}).`,
      );
    }

    try {
      const [livenessResponse, readinessResponse] = await Promise.all([
        fetch(`http://127.0.0.1:${applicationPort}/api/health/live`, {
          signal: AbortSignal.timeout(1_000),
        }),
        fetch(`http://127.0.0.1:${applicationPort}/api/health/ready`, {
          signal: AbortSignal.timeout(1_000),
        }),
      ]);

      await Promise.all([
        livenessResponse.body?.cancel(),
        readinessResponse.body?.cancel(),
      ]);

      if (livenessResponse.ok && readinessResponse.ok) {
        return;
      }
    } catch {
      // The process can accept probes only after Nest finishes bootstrap.
    }

    await new Promise((resolve) => setTimeout(resolve, PROBE_INTERVAL_MS));
  }

  throw new Error(
    'Production entry did not become healthy before the deadline.',
  );
}

async function waitForDrainingApplication(applicationPort) {
  const deadline = Date.now() + DRAINING_PROBE_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (hasApplicationExited) {
      throw new Error(
        `Production entry exited before exposing draining readiness (code ${String(applicationExit?.code)}, signal ${String(applicationExit?.signal)}).`,
      );
    }

    try {
      const [livenessResponse, readinessResponse] = await Promise.all([
        fetch(`http://127.0.0.1:${applicationPort}/api/health/live`, {
          signal: AbortSignal.timeout(1_000),
        }),
        fetch(`http://127.0.0.1:${applicationPort}/api/health/ready`, {
          signal: AbortSignal.timeout(1_000),
        }),
      ]);

      await Promise.all([
        livenessResponse.body?.cancel(),
        readinessResponse.body?.cancel(),
      ]);

      if (livenessResponse.ok && readinessResponse.status === 503) {
        return;
      }
    } catch {
      // The signal and readiness transition race with this short polling loop.
    }

    await new Promise((resolve) => setTimeout(resolve, PROBE_INTERVAL_MS));
  }

  throw new Error(
    'Production entry did not expose live=200 and ready=503 while draining.',
  );
}

async function expectApiEnvelopeResponse(
  url,
  expectedMessage,
  expectedData,
  acceptLanguage,
) {
  const response = await fetch(url, {
    headers: acceptLanguage
      ? {
          'accept-language': acceptLanguage,
        }
      : undefined,
    signal: AbortSignal.timeout(2_000),
  });
  const responseText = await response.text();
  let responseBody;

  try {
    responseBody = JSON.parse(responseText);
  } catch {
    throw new Error('Production route did not return a JSON API envelope.');
  }

  if (
    !response.ok ||
    typeof responseBody !== 'object' ||
    responseBody === null ||
    Array.isArray(responseBody) ||
    JSON.stringify(Object.keys(responseBody).sort()) !==
      JSON.stringify(['code', 'data', 'errors', 'message']) ||
    responseBody.code !== 200 ||
    responseBody.message !== expectedMessage ||
    responseBody.data !== expectedData ||
    responseBody.errors !== null
  ) {
    throw new Error(
      `Production route envelope verification failed with HTTP ${response.status}: ${responseText}`,
    );
  }
}

function waitForProcessExit(childProcess, timeoutMs) {
  if (hasApplicationExited && applicationExit) {
    return Promise.resolve(applicationExit);
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Production entry did not exit before the deadline.'));
    }, timeoutMs);

    childProcess.once('exit', (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal });
    });
  });
}
