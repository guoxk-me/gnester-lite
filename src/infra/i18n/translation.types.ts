import type { SupportedLanguage } from './language.types.js';

export interface LanguagePreference {
  readonly range: string;
  readonly quality: number;
  readonly position: number;
}

export interface SupportedLanguagePreference {
  readonly language: SupportedLanguage;
  readonly quality: number;
  readonly position: number;
}

export interface LanguageRequest {
  readonly headers?: Record<string, string | readonly string[] | undefined>;
  readonly raw?: {
    readonly headers?: Record<string, string | readonly string[] | undefined>;
  };
}

export interface LanguageClient extends LanguageRequest {
  readonly handshake?: LanguageRequest;
  readonly request?: LanguageRequest;
  readonly upgradeReq?: LanguageRequest;
}

export type ValidationConstraint =
  | 'arrayMaxSize'
  | 'arrayMinSize'
  | 'arrayNotEmpty'
  | 'isArray'
  | 'isBoolean'
  | 'isDate'
  | 'isEmail'
  | 'isEnum'
  | 'isIn'
  | 'isInt'
  | 'isNotEmpty'
  | 'isNumber'
  | 'isObject'
  | 'isString'
  | 'isUuid'
  | 'matches'
  | 'max'
  | 'maxLength'
  | 'min'
  | 'minLength'
  | 'nestedValidation'
  | 'whitelistValidation';

export type ValidationMessageKey = `validation.${ValidationConstraint}`;

export type HttpStatusMessageKey = `http.${number}`;
