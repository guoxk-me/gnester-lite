import * as Sentry from '@sentry/nestjs';

const sensitiveSpanAttributePattern =
  /(?:^|[._-])(?:authorization|bearer|body|cookie|credential|csrf|jwt|password|query|secret|session|token|xsrf)(?:$|[._-])/i;
const urlLikeSpanAttributePattern = /(?:^|[._-])(?:target|uri|url)(?:$|[._-])/i;
const httpDescriptionPattern =
  /(?:https?:\/\/|^(?:DELETE|GET|HEAD|OPTIONS|PATCH|POST|PUT)\s+\/|^\/)/i;
type SentryOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;
type SentrySpanPayload = Parameters<
  NonNullable<SentryOptions['beforeSendSpan']>
>[0];

export function stripSentryUrlDetails(url: string): string {
  const detailSeparatorIndex = url.search(/[?#]/);
  const urlWithoutDetails =
    detailSeparatorIndex === -1 ? url : url.slice(0, detailSeparatorIndex);

  // AI modified: absolute URLs may carry userinfo credentials before the host.
  return urlWithoutDetails.replace(/^([a-z][a-z\d+.-]*:\/\/)[^/@]*@/i, '$1');
}

function stripPossibleUrlDetails(description: string): string {
  return httpDescriptionPattern.test(description)
    ? stripSentryUrlDetails(description)
    : description;
}

function removeSensitiveRequestData<EventPayload extends Sentry.Event>(
  event: EventPayload,
): EventPayload {
  // AI modified: retain only routing diagnostics; request content and identity never leave the process.
  if (event.request) {
    const safeRequest: Sentry.RequestEventData = {};

    if (event.request.method) {
      safeRequest.method = event.request.method;
    }

    if (event.request.url) {
      safeRequest.url = stripSentryUrlDetails(event.request.url);
    }

    event.request = safeRequest;
  }

  delete event.user;
  delete event.breadcrumbs;

  return event;
}

export function removeSensitiveSpanData(
  span: SentrySpanPayload,
): SentrySpanPayload {
  const safeAttributes: SentrySpanPayload['data'] = {};

  for (const [attributeName, attributeValue] of Object.entries(span.data)) {
    if (sensitiveSpanAttributePattern.test(attributeName)) {
      continue;
    }

    safeAttributes[attributeName] =
      typeof attributeValue === 'string' &&
      urlLikeSpanAttributePattern.test(attributeName)
        ? stripSentryUrlDetails(attributeValue)
        : attributeValue;
  }

  return {
    ...span,
    data: safeAttributes,
    description:
      span.description === undefined
        ? undefined
        : stripPossibleUrlDetails(span.description),
  };
}

// AI modified: explicit deny-by-default collection survives SDK default changes.
export const sentryPrivacyOptions: SentryOptions = {
  maxBreadcrumbs: 0,
  dataCollection: {
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
  },
  integrations(defaultIntegrations) {
    const privacySafeDefaults = defaultIntegrations.filter(
      (integration) =>
        integration.name !== 'Http' && integration.name !== 'RequestData',
    );

    return [
      ...privacySafeDefaults,
      Sentry.httpIntegration({
        breadcrumbs: false,
        maxIncomingRequestBodySize: 'none',
        ignoreIncomingRequestBody: () => true,
      }),
      Sentry.requestDataIntegration({
        include: {
          cookies: false,
          data: false,
          headers: false,
          ip: false,
          query_string: false,
          url: false,
        },
      }),
    ];
  },
  beforeSend(event) {
    return removeSensitiveRequestData(event);
  },
  beforeSendTransaction(event) {
    removeSensitiveRequestData(event);
    event.transaction =
      event.transaction === undefined
        ? undefined
        : stripPossibleUrlDetails(event.transaction);
    event.spans = event.spans?.map(removeSensitiveSpanData);

    return event;
  },
  beforeSendSpan(span) {
    return removeSensitiveSpanData(span);
  },
};
