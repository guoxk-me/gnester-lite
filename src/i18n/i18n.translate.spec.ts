import { globSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { ExecutionContext } from '@nestjs/common';

import {
  resolveSupportedLanguage,
  SupportedLanguageResolver,
  translateKey,
  VALIDATION_CONSTRAINTS,
} from './i18n.translate';

const localeDirectory = join(__dirname, 'locales');

function catalogNamespaces(language: 'en' | 'zh'): string[] {
  return readdirSync(join(localeDirectory, language))
    .filter((fileName) => fileName.endsWith('.json'))
    .map((fileName) => fileName.slice(0, -'.json'.length))
    .sort();
}

const localeNamespaces = catalogNamespaces('en');

function readCatalog(
  language: 'en' | 'zh',
  namespace: string,
): Record<string, string> {
  return JSON.parse(
    readFileSync(join(localeDirectory, language, `${namespace}.json`), 'utf8'),
  ) as Record<string, string>;
}

function messagePlaceholders(message: string): string[] {
  return Array.from(
    message.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g),
    ([, placeholder]) => placeholder,
  ).sort();
}

describe('i18n.translate helpers', () => {
  describe('Accept-Language negotiation', () => {
    it('uses the fallback when the header is missing', () => {
      expect(resolveSupportedLanguage(undefined)).toBe('en');
    });

    it('honors quality weights instead of header order', () => {
      expect(resolveSupportedLanguage('en;q=0.5,zh;q=0.9')).toBe('zh');
    });

    it('maps a preferred regional language before a lower-weight exact language', () => {
      expect(resolveSupportedLanguage('zh-CN;q=1,en;q=0.8')).toBe('zh');
    });

    it('does not select a language excluded with q=0', () => {
      expect(resolveSupportedLanguage('zh-CN;q=0,en;q=0.5')).toBe('en');
      expect(resolveSupportedLanguage('en;q=0,*;q=0.5')).toBe('zh');
    });

    it('accepts an allowed regional preference over an excluded base range', () => {
      expect(resolveSupportedLanguage('zh;q=0,zh-CN;q=1,en;q=0.5')).toBe('zh');
    });

    it('uses a wildcard when no requested language is supported', () => {
      expect(resolveSupportedLanguage('fr-FR;q=1,*;q=0.5')).toBe('en');
    });

    it('ignores a language with an invalid quality value', () => {
      expect(resolveSupportedLanguage('zh;q=invalid,en;q=0.5')).toBe('en');
      expect(resolveSupportedLanguage('en;q=invalid,*;q=0.5')).toBe('en');
    });

    it('falls back to en when language is unsupported', () => {
      expect(resolveSupportedLanguage('fr-FR,fr;q=0.9')).toBe('en');
    });

    it('returns a base language from the Nest resolver', () => {
      const context = {
        getType: () => 'http',
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              'accept-language': 'zh-Hans-CN;q=1,en;q=0.8',
            },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(new SupportedLanguageResolver().resolve(context)).toBe('zh');
    });

    it('keeps Socket.IO handshake language negotiation', () => {
      const context = {
        getType: () => 'ws',
        switchToWs: () => ({
          getClient: () => ({
            handshake: {
              headers: {
                'accept-language': 'zh-TW,en;q=0.8',
              },
            },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(new SupportedLanguageResolver().resolve(context)).toBe('zh');
    });
  });

  it('returns the default value when I18nContext is absent', () => {
    expect(
      translateKey('errors.VALIDATION_FAILED', {
        defaultValue: 'Validation failed',
      }),
    ).toBe('Validation failed');
  });

  it('keeps locale keys and interpolation placeholders in parity', () => {
    // AI modified: discovering namespaces makes new catalog files part of the parity gate automatically.
    expect(catalogNamespaces('zh')).toEqual(localeNamespaces);

    for (const namespace of localeNamespaces) {
      const englishMessages = readCatalog('en', namespace);
      const chineseMessages = readCatalog('zh', namespace);

      expect(Object.keys(chineseMessages).sort()).toEqual(
        Object.keys(englishMessages).sort(),
      );

      for (const [messageKey, englishMessage] of Object.entries(
        englishMessages,
      )) {
        expect(messagePlaceholders(chineseMessages[messageKey] ?? '')).toEqual(
          messagePlaceholders(englishMessage),
        );
      }
    }
  });

  it('covers every validation constraint used by HTTP DTOs', () => {
    const repositoryRoot = join(__dirname, '../../../..');
    const dtoPaths = globSync('src/{features,examples}/**/*dto.ts', {
      cwd: repositoryRoot,
    });
    const constraintAliases: Record<string, string> = {
      IsUUID: 'isUuid',
      ValidateNested: 'nestedValidation',
    };
    const constraints = new Set<string>();

    for (const dtoPath of dtoPaths) {
      const source = readFileSync(join(repositoryRoot, dtoPath), 'utf8');
      const imports = source.matchAll(
        /import\s*\{([^}]*)\}\s*from ['"]class-validator['"];/g,
      );

      for (const [, importedNames = ''] of imports) {
        for (const importedName of importedNames.split(',')) {
          const decorator = importedName.trim();

          if (
            !decorator ||
            decorator === 'IsOptional' ||
            !source.includes(`@${decorator}(`)
          ) {
            continue;
          }

          constraints.add(
            constraintAliases[decorator] ??
              `${decorator.charAt(0).toLowerCase()}${decorator.slice(1)}`,
          );
        }
      }
    }

    const catalogConstraints = new Set<string>(VALIDATION_CONSTRAINTS);

    expect(
      [...constraints].filter(
        (constraint) => !catalogConstraints.has(constraint),
      ),
    ).toEqual([]);
    expect(Object.keys(readCatalog('en', 'validation')).sort()).toEqual(
      [...VALIDATION_CONSTRAINTS].sort(),
    );
  });

  it('includes adapter-level HTTP statuses that bypass controller DTOs', () => {
    expect(readCatalog('en', 'http')).toMatchObject({
      '410': 'Gone',
      '413': 'Payload Too Large',
      '502': 'Bad Gateway',
      '504': 'Gateway Timeout',
    });
    expect(readCatalog('zh', 'http')).toMatchObject({
      '410': '资源已不存在',
      '413': '请求体过大',
      '502': '网关错误',
      '504': '网关超时',
    });
  });
});
