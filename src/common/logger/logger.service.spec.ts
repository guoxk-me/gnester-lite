import { ConfigService } from '@nestjs/config';
import { Environment } from 'config/config.types';
import { SystemLoggerService } from './logger.service';

type LoggerOptionsSnapshot = {
  json: boolean;
  colors: boolean;
  timestamp: boolean;
  prefix: string;
  logLevels: string[];
};

function getLoggerOptions(logger: SystemLoggerService): LoggerOptionsSnapshot {
  return (logger as unknown as { options: LoggerOptionsSnapshot }).options;
}

describe('SystemLoggerService', () => {
  it('uses structured production logs by default', () => {
    const logger = new SystemLoggerService(
      new ConfigService({
        NODE_ENV: Environment.Production,
        app: {
          name: 'gnester-lite',
        },
      }),
    );

    expect(getLoggerOptions(logger)).toEqual({
      prefix: 'gnester-lite',
      json: true,
      colors: false,
      timestamp: false,
      logLevels: ['log', 'fatal', 'error', 'warn'],
    });
  });

  it('allows explicit log levels and JSON mode overrides', () => {
    const logger = new SystemLoggerService(
      new ConfigService({
        NODE_ENV: Environment.Development,
        LOGGER_JSON: true,
        LOGGER_LEVELS: 'error,warn,debug',
        app: {
          name: 'demo-app',
        },
      }),
    );

    expect(getLoggerOptions(logger)).toEqual({
      prefix: 'demo-app',
      json: true,
      colors: false,
      timestamp: false,
      logLevels: ['error', 'warn', 'debug'],
    });
  });
});
