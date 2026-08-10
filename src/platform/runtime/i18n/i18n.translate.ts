import { I18nContext } from 'nestjs-i18n';

import {
  I18N_FALLBACK_LANGUAGE,
  I18N_SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from './i18n.constants';

export function resolveSupportedLanguage(
  acceptLanguageHeader: string | undefined,
): SupportedLanguage {
  if (!acceptLanguageHeader) {
    return I18N_FALLBACK_LANGUAGE;
  }

  const candidates = acceptLanguageHeader
    .split(',')
    .map((part) => part.trim().split(';')[0]?.toLowerCase())
    .filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (candidate === 'zh' || candidate.startsWith('zh-')) {
      return 'zh';
    }

    if (candidate === 'en' || candidate.startsWith('en-')) {
      return 'en';
    }
  }

  return I18N_FALLBACK_LANGUAGE;
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

export function httpStatusMessageKey(statusCode: number): string {
  return `http.${statusCode}`;
}

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return (I18N_SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}
