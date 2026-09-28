import * as Sentry from '@sentry/nestjs';

import {
  removeSensitiveSpanData,
  sentryPrivacyOptions,
} from './sentry-privacy';

describe('Sentry privacy options', () => {
  const credentialSentinel = 'sentry-private-credential';

  afterEach(async () => {
    await Sentry.close(1_000);
  });

  it('denies sensitive SDK data collection explicitly', () => {
    expect(sentryPrivacyOptions.dataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: false,
        response: false,
      },
      httpBodies: [],
      urlQueryParams: false,
      graphQL: {
        document: false,
        variables: false,
      },
      genAI: {
        inputs: false,
        outputs: false,
      },
      databaseQueryData: false,
      stackFrameVariables: false,
      frameContextLines: 0,
    });
    expect(sentryPrivacyOptions.maxBreadcrumbs).toBe(0);
  });

  it('replaces request integrations with privacy-safe variants', () => {
    const integrationsOption = sentryPrivacyOptions.integrations;

    if (typeof integrationsOption !== 'function') {
      throw new Error('Sentry privacy integrations callback is missing');
    }

    const integrations = integrationsOption([
      Sentry.httpIntegration(),
      Sentry.requestDataIntegration(),
      Sentry.modulesIntegration(),
    ]);

    expect(integrations.map((integration) => integration.name)).toEqual([
      'Modules',
      'Http',
      'RequestData',
    ]);
  });

  it('removes sensitive request fields from the final transport envelope', async () => {
    const serializedEnvelopeParts: string[] = [];
    const userInfoSentinel = 'sentry-url-userinfo';
    // AI modified: isolate envelope serialization from SDK host discovery so the test leaves no child-process handles.
    const client = Sentry.initWithoutDefaultIntegrations({
      dsn: 'https://public@example.invalid/1',
      tracesSampleRate: 0,
      ...sentryPrivacyOptions,
      transport: () => ({
        send(envelope) {
          serializedEnvelopeParts.push(JSON.stringify(envelope));

          return Promise.resolve({ statusCode: 200 });
        },
        flush() {
          return Promise.resolve(true);
        },
      }),
    });

    expect(client).toBeDefined();

    Sentry.captureEvent({
      message: 'synthetic privacy regression',
      request: {
        url: `https://${userInfoSentinel}@service.example/orders?token=${credentialSentinel}#private`,
        method: 'POST',
        headers: {
          authorization: `Bearer ${credentialSentinel}`,
          cookie: `session=${credentialSentinel}`,
        },
        cookies: {
          session: credentialSentinel,
        },
        query_string: `token=${credentialSentinel}`,
        data: {
          password: credentialSentinel,
        },
        env: {
          REMOTE_ADDR: credentialSentinel,
        },
      },
      user: {
        id: credentialSentinel,
      },
      breadcrumbs: [
        {
          message: credentialSentinel,
        },
      ],
    });

    await expect(Sentry.flush(1_000)).resolves.toBe(true);

    const serializedEnvelopes = serializedEnvelopeParts.join('\n');

    expect(serializedEnvelopes).toContain('https://service.example/orders');
    expect(serializedEnvelopes).toContain('POST');
    expect(serializedEnvelopes).not.toContain(credentialSentinel);
    expect(serializedEnvelopes).not.toContain(userInfoSentinel);
    expect(serializedEnvelopes).not.toContain('authorization');
    expect(serializedEnvelopes).not.toContain('query_string');
  });

  it('removes sensitive trace attributes and URL details', () => {
    const span = removeSensitiveSpanData({
      span_id: '0123456789abcdef',
      trace_id: '0123456789abcdef0123456789abcdef',
      start_timestamp: 1,
      data: {
        'http.request.header.authorization': credentialSentinel,
        'http.request.body': credentialSentinel,
        'http.url': `https://user:${credentialSentinel}@service.example/orders?token=${credentialSentinel}`,
        'http.method': 'GET',
      },
      description: `GET /orders?token=${credentialSentinel}`,
    });

    expect(span.data).toEqual({
      'http.url': 'https://service.example/orders',
      'http.method': 'GET',
    });
    expect(span.description).toBe('GET /orders');
  });
});
