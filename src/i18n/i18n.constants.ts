export const I18N_FALLBACK_LANGUAGE = 'en';
export const I18N_SUPPORTED_LANGUAGES = ['en', 'zh'] as const;

export type SupportedLanguage = (typeof I18N_SUPPORTED_LANGUAGES)[number];

export const SKIP_API_ENVELOPE_KEY = 'skipApiEnvelope';
export const SKIP_API_ENVELOPE_OPENAPI_EXTENSION = 'x-skip-api-envelope';
