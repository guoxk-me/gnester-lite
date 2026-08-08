import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';

export const PRODUCTION_SHUTDOWN_TIMEOUT_MS = 20_000;

export function applicationShutdownBudgetMs(shutdownConfig) {
  const budgetFields = [
    ['readinessPropagationDelayMs', true],
    ['applicationCloseTimeoutMs', false],
    ['telemetryCloseTimeoutMs', false],
  ];
  let totalBudgetMs = 0;

  for (const [field, canBeZero] of budgetFields) {
    const fieldBudgetMs = shutdownConfig?.[field];
    const minimum = canBeZero ? 0 : 1;

    if (!Number.isInteger(fieldBudgetMs) || fieldBudgetMs < minimum) {
      throw new Error(`shutdown.${field} must be an integer >= ${minimum}.`);
    }

    totalBudgetMs += fieldBudgetMs;
  }

  if (!Number.isSafeInteger(totalBudgetMs)) {
    throw new Error(
      'The total application shutdown budget must be a safe integer.',
    );
  }

  return totalBudgetMs;
}

export function millisecondsFromComposeDuration(duration) {
  const match = /^(\d+)(ms|s|m)$/.exec(String(duration));

  if (!match) {
    throw new Error(
      'services.app.stop_grace_period must use an integer ms, s, or m duration.',
    );
  }

  const amount = Number(match[1]);
  const multipliers = { ms: 1, s: 1_000, m: 60_000 };

  return amount * multipliers[match[2]];
}

export function verifyShutdownBudgets({
  shutdownConfig,
  productionVerifierTimeoutMs,
  composeStopGracePeriod,
}) {
  const internalBudgetMs = applicationShutdownBudgetMs(shutdownConfig);
  const composeStopGracePeriodMs = millisecondsFromComposeDuration(
    composeStopGracePeriod,
  );

  // AI modified: external supervisors must leave strict margin beyond every internal shutdown phase.
  if (productionVerifierTimeoutMs <= internalBudgetMs) {
    throw new Error(
      `Production verifier timeout ${productionVerifierTimeoutMs}ms must exceed the ${internalBudgetMs}ms application shutdown budget.`,
    );
  }

  if (composeStopGracePeriodMs <= internalBudgetMs) {
    throw new Error(
      `Compose stop grace ${composeStopGracePeriodMs}ms must exceed the ${internalBudgetMs}ms application shutdown budget.`,
    );
  }

  return internalBudgetMs;
}

export function verifyWorkspaceShutdownContract(projectDirectory) {
  const applicationConfig = yaml.load(
    readFileSync(`${projectDirectory}/config/config.yaml`, 'utf8'),
  );
  const composeConfig = yaml.load(
    readFileSync(`${projectDirectory}/docker-compose.yml`, 'utf8'),
  );
  const internalBudgetMs = verifyShutdownBudgets({
    shutdownConfig: applicationConfig?.shutdown,
    productionVerifierTimeoutMs: PRODUCTION_SHUTDOWN_TIMEOUT_MS,
    composeStopGracePeriod: composeConfig?.services?.app?.stop_grace_period,
  });

  process.stdout.write(
    `Shutdown budgets are aligned: application ${internalBudgetMs}ms, verifier ${PRODUCTION_SHUTDOWN_TIMEOUT_MS}ms, Compose ${String(composeConfig.services.app.stop_grace_period)}.\n`,
  );
}

const scriptPath = fileURLToPath(import.meta.url);

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  verifyWorkspaceShutdownContract(
    fileURLToPath(new URL('..', import.meta.url)),
  );
}
