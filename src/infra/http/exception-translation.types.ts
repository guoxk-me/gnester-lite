export interface ExceptionTranslationOptions {
  readonly args?: Record<string, unknown>;
  readonly defaultValue: string;
}

export type ExceptionTranslator = (
  key: string,
  options: ExceptionTranslationOptions,
) => string;
