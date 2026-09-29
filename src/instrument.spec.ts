import * as Sentry from '@sentry/nestjs';

import {
  loadProjectEnvironmentFiles,
  sentryBootstrapEnvironment,
  shouldInitializeSentry,
} from './config/environment-files.js';

vi.mock('@sentry/nestjs', () => ({
  init: vi.fn(),
}));
vi.mock('./config/environment-files.js', () => ({
  loadProjectEnvironmentFiles: vi.fn(),
  sentryBootstrapEnvironment: vi.fn(),
  shouldInitializeSentry: vi.fn(),
}));
vi.mock('./sentry/sentry-privacy.js', () => ({
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
    vi.mocked(sentryBootstrapEnvironment).mockReturnValue({
      isEnabled: true,
      tracesSampleRate: 0.25,
    });
    vi.mocked(shouldInitializeSentry).mockReturnValue(true);

    const modulePath = './instrument.js';
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
