import { ConfigService } from '@nestjs/config';
import { Environment } from 'config/config.types';
import { createPinoLoggerParams, nestLevelsToPinoLevel } from './logger.config';

describe('nestLevelsToPinoLevel', () => {
  it('defaults production to info and development to debug', () => {
    expect(nestLevelsToPinoLevel(undefined, Environment.Production)).toBe(
      'info',
    );
    expect(nestLevelsToPinoLevel(undefined, Environment.Development)).toBe(
      'debug',
    );
    expect(nestLevelsToPinoLevel(undefined, Environment.Test)).toBe('warn');
  });

  it('maps the most verbose Nest level to a Pino threshold', () => {
    expect(
      nestLevelsToPinoLevel('error,warn,debug', Environment.Production),
    ).toBe('debug');
    expect(nestLevelsToPinoLevel('log,error', Environment.Production)).toBe(
      'info',
    );
    expect(nestLevelsToPinoLevel('verbose', Environment.Production)).toBe(
      'trace',
    );
  });
});

describe('createPinoLoggerParams', () => {
  it('uses structured JSON logs in production by default', () => {
    const params = createPinoLoggerParams(
      new ConfigService({
        NODE_ENV: Environment.Production,
        app: {
          name: 'gnester-lite',
        },
      }),
    );

    expect(params.pinoHttp).toMatchObject({
      name: 'gnester-lite',
      level: 'info',
      quietReqLogger: true,
      transport: undefined,
    });
  });

  it('enables pino-pretty when JSON mode is disabled outside test', () => {
    const params = createPinoLoggerParams(
      new ConfigService({
        NODE_ENV: Environment.Development,
        LOGGER_JSON: false,
        LOGGER_LEVELS: 'error,warn,debug',
        app: {
          name: 'demo-app',
        },
      }),
    );

    expect(params.pinoHttp).toMatchObject({
      name: 'demo-app',
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: true,
          translateTime: 'SYS:standard',
        },
      },
    });
  });

  it('keeps JSON output in test even when LOGGER_JSON is false', () => {
    const params = createPinoLoggerParams(
      new ConfigService({
        NODE_ENV: Environment.Test,
        LOGGER_JSON: false,
        app: {
          name: 'gnester-lite',
        },
      }),
    );

    expect(params.pinoHttp).toMatchObject({
      level: 'warn',
      transport: undefined,
    });
  });
});
