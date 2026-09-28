import { Injectable, type ExecutionContext } from '@nestjs/common';
import { I18nContext, type I18nResolver } from 'nestjs-i18n';

import {
  I18N_FALLBACK_LANGUAGE,
  I18N_SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from './i18n.constants';

interface LanguagePreference {
  readonly range: string;
  readonly quality: number;
  readonly position: number;
}

interface SupportedLanguagePreference {
  readonly language: SupportedLanguage;
  readonly quality: number;
  readonly position: number;
}

interface LanguageRequest {
  readonly headers?: Record<string, string | readonly string[] | undefined>;
  readonly raw?: {
    readonly headers?: Record<string, string | readonly string[] | undefined>;
  };
}

interface LanguageClient extends LanguageRequest {
  readonly handshake?: LanguageRequest;
  readonly request?: LanguageRequest;
  readonly upgradeReq?: LanguageRequest;
}

// AI modified: catalog-backed validation keys stay explicit so unknown constraints safely use class-validator text.
export const VALIDATION_CONSTRAINTS = [
  'arrayMaxSize',
  'arrayMinSize',
  'arrayNotEmpty',
  'isArray',
  'isBoolean',
  'isDate',
  'isEmail',
  'isEnum',
  'isIn',
  'isInt',
  'isNotEmpty',
  'isNumber',
  'isObject',
  'isString',
  'isUuid',
  'matches',
  'max',
  'maxLength',
  'min',
  'minLength',
  'nestedValidation',
  'whitelistValidation',
] as const;

export type ValidationConstraint = (typeof VALIDATION_CONSTRAINTS)[number];
export type ValidationMessageKey = `validation.${ValidationConstraint}`;
export type HttpStatusMessageKey = `http.${number}`;

// AI modified: apply RFC-style q weights before mapping regional ranges onto supported base languages.
function languageQuality(
  qualityParameterValue: string | undefined,
): number | undefined {
  if (qualityParameterValue === undefined) {
    return 1;
  }

  const quality = qualityParameterValue.trim();

  if (!/^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(quality)) {
    return undefined;
  }

  return Number(quality);
}

function languagePreferences(
  acceptLanguageParts: readonly string[],
): LanguagePreference[] {
  return acceptLanguageParts.flatMap((headerPart, position) => {
    const [languageRange, ...parameters] = headerPart
      .trim()
      .split(';')
      .map((part) => part.trim());
    const range = languageRange?.toLowerCase();

    if (
      !range ||
      (range !== '*' && !/^[a-z]{1,8}(?:-[a-z0-9]{1,8})*$/.test(range))
    ) {
      return [];
    }

    const qualityParameter = parameters.find((parameter) =>
      /^q\s*=/i.test(parameter),
    );
    const qualityValue = qualityParameter?.split('=', 2)[1];
    const quality = languageQuality(qualityValue);

    if (quality === undefined) {
      return [];
    }

    return [
      {
        range,
        quality,
        position,
      },
    ];
  });
}

function supportedLanguagePreference(
  language: SupportedLanguage,
  preferences: LanguagePreference[],
): SupportedLanguagePreference | undefined {
  const directPreferences = preferences.filter(
    ({ range }) => range !== '*' && range.split('-', 1)[0] === language,
  );
  const applicablePreferences =
    directPreferences.length > 0
      ? directPreferences
      : preferences.filter(({ range }) => range === '*');
  const preferred = applicablePreferences.reduce<
    LanguagePreference | undefined
  >((current, candidate) => {
    if (
      !current ||
      candidate.quality > current.quality ||
      (candidate.quality === current.quality &&
        candidate.position < current.position)
    ) {
      return candidate;
    }

    return current;
  }, undefined);

  return preferred
    ? {
        language,
        quality: preferred.quality,
        position: preferred.position,
      }
    : undefined;
}

export function resolveSupportedLanguage(
  acceptLanguageHeader: string | readonly string[] | undefined,
): SupportedLanguage {
  if (!acceptLanguageHeader) {
    return I18N_FALLBACK_LANGUAGE;
  }

  const headerParts =
    typeof acceptLanguageHeader === 'string'
      ? acceptLanguageHeader.split(',')
      : acceptLanguageHeader.flatMap((header) => header.split(','));
  const preferences = languagePreferences(headerParts);
  const supportedPreferences = I18N_SUPPORTED_LANGUAGES.map((language) =>
    supportedLanguagePreference(language, preferences),
  ).filter(
    (preference): preference is SupportedLanguagePreference =>
      preference !== undefined && preference.quality > 0,
  );
  const preferred = supportedPreferences.reduce<
    SupportedLanguagePreference | undefined
  >((current, candidate) => {
    if (
      !current ||
      candidate.quality > current.quality ||
      (candidate.quality === current.quality &&
        candidate.position < current.position)
    ) {
      return candidate;
    }

    return current;
  }, undefined);

  return preferred?.language ?? I18N_FALLBACK_LANGUAGE;
}

function acceptLanguageHeader(context: ExecutionContext): string | undefined {
  let request: LanguageRequest | undefined;

  if (context.getType() === 'http') {
    request = context.switchToHttp().getRequest();
  } else if (context.getType() === 'ws') {
    const client = context.switchToWs().getClient<LanguageClient>();
    request =
      client?.handshake ?? client?.upgradeReq ?? client?.request ?? client;
  }

  const header =
    request?.raw?.headers?.['accept-language'] ??
    request?.headers?.['accept-language'];

  return typeof header === 'string' ? header : header?.join(',');
}

@Injectable()
export class SupportedLanguageResolver implements I18nResolver {
  resolve(context: ExecutionContext): SupportedLanguage | undefined {
    if (context.getType() !== 'http' && context.getType() !== 'ws') {
      return undefined;
    }

    // AI modified: Nest and pre-Nest middleware now share one weighted negotiation contract.
    return resolveSupportedLanguage(acceptLanguageHeader(context));
  }
}

export function translateKey(
  key: string,
  options: {
    readonly lang?: string;
    readonly args?: Record<string, unknown>;
    readonly defaultValue?: string;
  } = {},
): string {
  const i18n = I18nContext.current();
  const lang = options.lang ?? i18n?.lang ?? I18N_FALLBACK_LANGUAGE;

  if (!i18n) {
    return options.defaultValue ?? key;
  }

  const translated = i18n.t(key, {
    lang,
    args: options.args,
    defaultValue: options.defaultValue ?? key,
  });

  return typeof translated === 'string' ? translated : String(translated);
}

export function httpStatusMessageKey(statusCode: number): HttpStatusMessageKey {
  return `http.${statusCode}`;
}

export function validationMessageKey(
  constraint: string,
): ValidationMessageKey | undefined {
  return (VALIDATION_CONSTRAINTS as readonly string[]).includes(constraint)
    ? `validation.${constraint as ValidationConstraint}`
    : undefined;
}

export function isSupportedLanguage(
  languageCandidate: string,
): languageCandidate is SupportedLanguage {
  return (I18N_SUPPORTED_LANGUAGES as readonly string[]).includes(
    languageCandidate,
  );
}
