import { ConsoleLogger, Injectable, type LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Environment } from 'config/config.types';

const loggerLevels: readonly LogLevel[] = [
  'log',
  'fatal',
  'error',
  'warn',
  'debug',
  'verbose',
] as const;
const productionLoggerLevels: readonly LogLevel[] = [
  'log',
  'fatal',
  'error',
  'warn',
] as const;

function getLoggerLevels(
  configuredLevels: string | undefined,
  nodeEnv: Environment,
): LogLevel[] {
  if (!configuredLevels) {
    return [
      ...(nodeEnv === Environment.Production
        ? productionLoggerLevels
        : loggerLevels),
    ];
  }

  return configuredLevels
    .split(',')
    .map((level) => level.trim())
    .filter((level): level is LogLevel =>
      loggerLevels.includes(level as LogLevel),
    );
}

// AI modified: centralizes Nest system and application logs behind one DI logger.
@Injectable()
export class SystemLoggerService extends ConsoleLogger {
  constructor(configService: ConfigService) {
    const nodeEnv = configService.get<Environment>(
      'NODE_ENV',
      Environment.Development,
    );
    const isJsonEnabled = configService.get<boolean>(
      'LOGGER_JSON',
      nodeEnv === Environment.Production,
    );

    super({
      prefix: configService.get<string>('app.name', 'gnester-lite'),
      json: isJsonEnabled,
      colors: !isJsonEnabled,
      timestamp: !isJsonEnabled,
      logLevels: getLoggerLevels(
        configService.get<string>('LOGGER_LEVELS'),
        nodeEnv,
      ),
    });
  }
}
