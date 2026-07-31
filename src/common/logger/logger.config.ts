import type { LogLevel } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { IncomingMessage } from 'node:http';
import type { Level } from 'pino';
import type { StdSerializedResults } from 'pino-http';
import type { Params } from 'nestjs-pino';
import { Environment } from 'config/config.types';

const standardSensitiveLogPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers.proxy-authorization',
  'req.headers["x-csrf-token"]',
  'req.headers["x-xsrf-token"]',
  'res.headers["set-cookie"]',
] as const;

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

export function shouldIgnoreRequestLog(req: IncomingMessage): boolean {
  if (!req.url) {
    return false;
  }

  try {
    const { pathname } = new URL(req.url, 'http://localhost');

    // AI modified: suppress only the two intentional infrastructure probes, not arbitrary health-like paths.
    return pathname === '/health/live' || pathname === '/health/ready';
  } catch {
    return false;
  }
}

function sensitiveLogPaths(configService: ConfigService): string[] {
  const csrfHeaderName = configService
    .get<string>('CSRF_HEADER_NAME', 'x-csrf-token')
    .toLowerCase();

  return [
    ...new Set([
      ...standardSensitiveLogPaths,
      `req.headers["${csrfHeaderName}"]`,
    ]),
  ];
}

function requestPathname(requestUrl: string): string {
  try {
    return new URL(requestUrl, 'http://localhost').pathname;
  } catch {
    return requestUrl.split('?')[0] ?? '';
  }
}

function requestLogSerializer(
  request: StdSerializedResults['req'],
): Record<string, unknown> {
  // AI modified: keep a header-free access-log allowlist so unknown credential headers cannot escape a denylist.
  return {
    id: request.id,
    method: request.method,
    url: requestPathname(request.url),
    remoteAddress: request.remoteAddress,
    remotePort: request.remotePort,
  };
}

function responseLogSerializer(
  response: StdSerializedResults['res'],
): Record<string, unknown> {
  // AI modified: response headers use the same fail-closed policy because redirects can carry credentials.
  return {
    statusCode: response.statusCode,
  };
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
  // AI modified: production never resolves the development-only pino-pretty transport.
  const shouldUsePrettyTransport =
    !isJsonEnabled &&
    nodeEnv !== Environment.Production &&
    nodeEnv !== Environment.Test;

  return {
    pinoHttp: {
      name: configService.get<string>('app.name', 'gnester-lite'),
      level,
      transport: shouldUsePrettyTransport
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
      serializers: {
        req: requestLogSerializer,
        res: responseLogSerializer,
      },
      // AI modified: remove credentials before request/response objects reach any log sink.
      redact: {
        paths: sensitiveLogPaths(configService),
        remove: true,
      },
      quietReqLogger: true,
    },
  };
}
