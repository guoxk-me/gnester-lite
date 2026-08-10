import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { createConnection } from 'mysql2/promise';
import { assertDisposableInfrastructure } from './run-destructive-integration.mjs';
import { PRODUCTION_SHUTDOWN_TIMEOUT_MS } from './verify-shutdown-contract.mjs';

const STARTUP_TIMEOUT_MS = 30_000;
const DRAINING_PROBE_TIMEOUT_MS = 2_000;
const PROBE_INTERVAL_MS = 100;

// AI modified: retain the destructive safety gate even when this inner verifier is invoked directly.
assertDisposableInfrastructure(process.env);

const port = await reserveLoopbackPort();
const betterAuthEmail = `production-smoke-${process.pid}-${Date.now()}@example.com`;
const applicationProcess = spawn(process.execPath, ['dist/src/main.js'], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    BETTER_AUTH_URL: 'https://auth-smoke.example.com',
    CORS_ORIGINS: 'https://auth-smoke.example.com',
  },
  stdio: 'inherit',
});
let hasApplicationExited = false;
let applicationExit;
let betterAuthUserId;

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
  // AI modified: exercise the real ESM Better Auth handler, MySQL schema, and opaque cookie session.
  await verifyBetterAuth(port, betterAuthEmail, (createdUserId) => {
    // AI modified: retain the exact smoke-owned record ID so cleanup cannot delete a pre-existing user after an email collision.
    betterAuthUserId = createdUserId;
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
    'Production entry passed health and Better Auth probes, then shut down cleanly.\n',
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

if (betterAuthUserId) {
  try {
    await removeBetterAuthUser(betterAuthUserId, betterAuthEmail);
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

async function verifyBetterAuth(applicationPort, email, recordCreatedUser) {
  const authBaseURL = `http://127.0.0.1:${applicationPort}/api/auth`;
  const applicationOrigin = 'https://auth-smoke.example.com';
  const forwardedRequestHeaders = {
    host: 'auth-smoke.example.com',
    'x-forwarded-proto': 'https',
  };
  const password = `Better-Auth-${Date.now()}!`;
  const signUpResponse = await fetch(`${authBaseURL}/sign-up/email`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: applicationOrigin,
      ...forwardedRequestHeaders,
    },
    body: JSON.stringify({
      name: 'Production Smoke User',
      email,
      password,
    }),
    signal: AbortSignal.timeout(5_000),
  });
  const signUpBody = await expectJsonResponse(signUpResponse, 'sign up');

  if (
    signUpBody?.user?.email !== email ||
    typeof signUpBody?.user?.id !== 'string'
  ) {
    throw new Error('Better Auth sign up returned an unexpected user.');
  }

  recordCreatedUser(signUpBody.user.id);
  expectSecureSessionCookie(signUpResponse, 'sign up');
  const cookie = responseCookies(signUpResponse);
  const sessionResponse = await fetch(`${authBaseURL}/get-session`, {
    headers: {
      cookie,
      origin: applicationOrigin,
      ...forwardedRequestHeaders,
    },
    signal: AbortSignal.timeout(5_000),
  });
  const sessionBody = await expectJsonResponse(sessionResponse, 'get session');

  if (sessionBody?.user?.email !== email || !sessionBody?.session?.id) {
    throw new Error('Better Auth did not persist the signed-in session.');
  }

  const signOutResponse = await fetch(`${authBaseURL}/sign-out`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie,
      origin: applicationOrigin,
      ...forwardedRequestHeaders,
    },
    body: '{}',
    signal: AbortSignal.timeout(5_000),
  });
  const signOutBody = await expectJsonResponse(signOutResponse, 'sign out');

  if (signOutBody?.success !== true) {
    throw new Error('Better Auth sign out did not report success.');
  }

  expectClearedSessionCookie(signOutResponse);
  const revokedSessionResponse = await fetch(
    `${authBaseURL}/get-session?disableCookieCache=true`,
    {
      headers: {
        cookie,
        origin: applicationOrigin,
        ...forwardedRequestHeaders,
      },
      signal: AbortSignal.timeout(5_000),
    },
  );
  const revokedSessionBody = await expectJsonResponse(
    revokedSessionResponse,
    'verify revoked session',
  );

  if (revokedSessionBody !== null) {
    throw new Error('Better Auth sign out did not revoke the server session.');
  }

  const signInResponse = await fetch(`${authBaseURL}/sign-in/email`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: applicationOrigin,
      ...forwardedRequestHeaders,
    },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(5_000),
  });
  const signInBody = await expectJsonResponse(signInResponse, 'sign in');

  if (signInBody?.user?.email !== email) {
    throw new Error('Better Auth sign in returned an unexpected user.');
  }

  expectSecureSessionCookie(signInResponse, 'sign in');
  const signedInCookie = responseCookies(signInResponse);
  const signedInSessionResponse = await fetch(`${authBaseURL}/get-session`, {
    headers: {
      cookie: signedInCookie,
      origin: applicationOrigin,
      ...forwardedRequestHeaders,
    },
    signal: AbortSignal.timeout(5_000),
  });
  const signedInSessionBody = await expectJsonResponse(
    signedInSessionResponse,
    'get signed-in session',
  );

  if (
    signedInSessionBody?.user?.email !== email ||
    !signedInSessionBody?.session?.id
  ) {
    throw new Error('Better Auth sign in did not create a persisted session.');
  }
}

async function expectJsonResponse(response, operation) {
  const responseText = await response.text();

  if (response.status !== 200) {
    throw new Error(
      `Better Auth ${operation} failed with ${response.status}: ${responseText}`,
    );
  }

  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`Better Auth ${operation} did not return JSON.`);
  }

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(`Better Auth ${operation} did not return JSON.`);
  }
}

function expectSecureSessionCookie(response, operation) {
  const sessionCookie = response.headers
    .getSetCookie()
    .find((setCookie) => setCookie.includes('better-auth.session_token='));

  if (!sessionCookie || !/;\s*Secure(?:;|$)/i.test(sessionCookie)) {
    throw new Error(
      `Better Auth ${operation} did not set a Secure session cookie.`,
    );
  }
}

function expectClearedSessionCookie(response) {
  const hasClearedSessionCookie = response.headers
    .getSetCookie()
    .some(
      (setCookie) =>
        setCookie.includes('better-auth.session_token=') &&
        /;\s*Max-Age=0(?:;|$)/i.test(setCookie),
    );

  if (!hasClearedSessionCookie) {
    throw new Error('Better Auth sign out did not clear the session cookie.');
  }
}

function responseCookies(response) {
  const cookies = response.headers
    .getSetCookie()
    .map((setCookie) => setCookie.split(';', 1)[0])
    .filter(Boolean);

  if (cookies.length === 0) {
    throw new Error('Better Auth sign up did not set a session cookie.');
  }

  return cookies.join('; ');
}

async function removeBetterAuthUser(userId, email) {
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
        'Could not remove every Better Auth smoke record.',
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
        fetch(`http://127.0.0.1:${applicationPort}/health/live`, {
          signal: AbortSignal.timeout(1_000),
        }),
        fetch(`http://127.0.0.1:${applicationPort}/health/ready`, {
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
        fetch(`http://127.0.0.1:${applicationPort}/health/live`, {
          signal: AbortSignal.timeout(1_000),
        }),
        fetch(`http://127.0.0.1:${applicationPort}/health/ready`, {
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
