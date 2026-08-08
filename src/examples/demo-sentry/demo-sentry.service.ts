import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Environment } from 'config/config.types';
import { shouldInitializeSentry } from 'config/environment-files';
import { DemoSentryScenarioDto } from './dto/demo-sentry-scenario.dto';
import { DemoSentryStatusDto } from './dto/demo-sentry-status.dto';

@Injectable()
export class DemoSentryService {
  constructor(private readonly configService: ConfigService) {}

  getScenarios(): DemoSentryScenarioDto[] {
    return [
      {
        name: 'status',
        path: 'GET /demo-sentry/status',
        purpose:
          'Show whether SENTRY_DSN is configured and which sample rate applies.',
      },
      {
        name: 'debug-sentry',
        path: 'GET /demo-sentry/debug-sentry',
        purpose:
          'Throw an unhandled Error so SentryGlobalFilter can report it when a DSN is set.',
      },
    ];
  }

  getStatus(): DemoSentryStatusDto {
    const nodeEnv = this.configService.get<Environment>(
      'NODE_ENV',
      Environment.Development,
    );
    const sentryDsn = this.configService.get<string>('SENTRY_DSN')?.trim();
    // AI modified: report the exact same environment gate used by instrument.ts.
    const isEnabled = shouldInitializeSentry(
      nodeEnv,
      sentryDsn,
      this.configService.get<boolean>('SENTRY_ENABLED', true),
    );
    const configuredSampleRate = this.configService.get<number>(
      'SENTRY_TRACES_SAMPLE_RATE',
    );
    const tracesSampleRate =
      configuredSampleRate ?? (nodeEnv === Environment.Production ? 0.1 : 1);

    return {
      enabled: isEnabled,
      hasDsn: Boolean(sentryDsn),
      environment: nodeEnv,
      tracesSampleRate: isEnabled ? tracesSampleRate : null,
      notes: [
        'Sentry.init runs in src/instrument.ts before Nest bootstraps.',
        'Empty SENTRY_DSN keeps the template runnable without a Sentry project.',
        'HttpException responses are not captured by default; unexpected errors are.',
        'Use withSentryIsolation() around cron, queue, and event handlers.',
      ],
    };
  }

  // AI modified: deliberate failure endpoint for verifying Sentry capture.
  triggerDebugError(): never {
    throw new Error('My first Sentry error!');
  }
}
