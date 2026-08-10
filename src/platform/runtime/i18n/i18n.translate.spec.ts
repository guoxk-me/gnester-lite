import { resolveSupportedLanguage, translateKey } from './i18n.translate';

describe('i18n.translate helpers', () => {
  it('prefers zh from Accept-Language', () => {
    expect(resolveSupportedLanguage('zh-CN,zh;q=0.9,en;q=0.8')).toBe('zh');
  });

  it('falls back to en when language is unsupported', () => {
    expect(resolveSupportedLanguage('fr-FR,fr;q=0.9')).toBe('en');
  });

  it('returns the default value when I18nContext is absent', () => {
    expect(
      translateKey('errors.VALIDATION_FAILED', {
        defaultValue: 'Validation failed',
      }),
    ).toBe('Validation failed');
  });
});
