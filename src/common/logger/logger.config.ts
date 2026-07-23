import type { LogLevel } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { IncomingMessage } from 'node:http';
import type { Level } from 'pino';
import type { Params } from 'nestjs-pino';
import { Environment } from 'config/config.types';

const nestLogLevels: readonly LogLevel[] = [
  'verbose',
  'debug',
  'log',
  'warn',
  'error',
  'fatal',
] as const;

const nestLevelToPinoLevel: Record<LogLevel, Level> = {
  verbose: 'trace',
  debug: 'debug',
  log: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'fatal',
};

const nestLevelRank: Record<LogLevel, number> = {
  verbose: 10,
  debug: 20,
  log: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

// AI modified: maps Nest LOGGER_LEVELS allowlist to a single Pino threshold level.
export function nestLevelsToPinoLevel(
  configuredLevels: string | undefined,
  nodeEnv: Environment,
): Level {
  if (!configuredLevels) {
    if (nodeEnv === Environment.Production) {
      return 'info';
    }

    if (nodeEnv === Environment.Test) {
      return 'warn';
    }

    return 'debug';
  }

  const nestLevels = configuredLevels
    .split(',')
    .map((level) => level.trim())
    .filter((level): level is LogLevel =>
      nestLogLevels.includes(level as LogLevel),
    );

  if (nestLevels.length === 0) {
    return nestLevelsToPinoLevel(undefined, nodeEnv);
  }

  const mostVerbose = nestLevels.reduce((current, level) =>
    nestLevelRank[level] < nestLevelRank[current] ? level : current,
  );

  return nestLevelToPinoLevel[mostVerbose];
}

function shouldIgnoreRequestLog(req: IncomingMessage): boolean {
  return req.url?.includes('/health') ?? false;
}

// AI modified: builds nestjs-pino params from existing LOGGER_* / app.name config.
export function createPinoLoggerParams(configService: ConfigService): Params {
  const nodeEnv = configService.get<Environment>(
    'NODE_ENV',
    Environment.Development,
  );
  const isJsonEnabled = configService.get<boolean>(
    'LOGGER_JSON',
    nodeEnv === Environment.Production,
  );
  const level = nestLevelsToPinoLevel(
    configService.get<string>('LOGGER_LEVELS'),
    nodeEnv,
  );
  const usePrettyTransport = !isJsonEnabled && nodeEnv !== Environment.Test;

  return {
    pinoHttp: {
      name: configService.get<string>('app.name', 'gnester-lite'),
      level,
      transport: usePrettyTransport
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:standard',
            },
          }
        : undefined,
      autoLogging: {
        ignore: shouldIgnoreRequestLog,
      },
      quietReqLogger: true,
    },
  };
}
