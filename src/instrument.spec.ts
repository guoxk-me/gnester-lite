import * as Sentry from '@sentry/nestjs';

import {
  loadProjectEnvironmentFiles,
  sentryBootstrapEnvironment,
  shouldInitializeSentry,
} from 'config/environment-files';

jest.mock('@sentry/nestjs', () => ({
  init: jest.fn(),
}));
jest.mock('config/environment-files', () => ({
  loadProjectEnvironmentFiles: jest.fn(),
  sentryBootstrapEnvironment: jest.fn(),
  shouldInitializeSentry: jest.fn(),
}));
jest.mock('./platform/observability/sentry/sentry-privacy', () => ({
  sentryPrivacyOptions: {
    maxBreadcrumbs: 0,
    dataCollection: {
      httpBodies: [],
    },
  },
}));

describe('Sentry instrumentation bootstrap', () => {
  const originalEnvironment = process.env;

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('initializes once with validated environment and shared privacy options', async () => {
    process.env = {
      NODE_ENV: 'production',
      SENTRY_DSN: ' https://public@example.invalid/1 ',
    };
    jest.mocked(sentryBootstrapEnvironment).mockReturnValue({
      isEnabled: true,
      tracesSampleRate: 0.25,
    });
    jest.mocked(shouldInitializeSentry).mockReturnValue(true);

    const modulePath = './instrument';
    await import(modulePath);

    expect(loadProjectEnvironmentFiles).toHaveBeenCalledTimes(1);
    expect(sentryBootstrapEnvironment).toHaveBeenCalledWith(process.env);
    expect(shouldInitializeSentry).toHaveBeenCalledWith(
      'production',
      'https://public@example.invalid/1',
      true,
    );
    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith({
      dsn: 'https://public@example.invalid/1',
      environment: 'production',
      tracesSampleRate: 0.25,
      maxBreadcrumbs: 0,
      dataCollection: {
        httpBodies: [],
      },
    });
  });
});
