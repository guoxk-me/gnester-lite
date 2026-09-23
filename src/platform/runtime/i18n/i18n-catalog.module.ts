import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { I18nModule } from 'nestjs-i18n';

import { I18N_FALLBACK_LANGUAGE } from './i18n.constants';
import { SupportedLanguageResolver } from './i18n.translate';

// AI modified: catalog-only root so CSRF and other consumers can translate without HTTP envelope side effects.
@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: I18N_FALLBACK_LANGUAGE,
      fallbacks: {
        'en-*': 'en',
        'zh-*': 'zh',
      },
      loaderOptions: {
        path: join(__dirname, 'locales'),
        watch: false,
      },
      // AI modified: resolve directly to a supported base language after weighted negotiation.
      resolvers: [SupportedLanguageResolver],
    }),
  ],
  exports: [I18nModule],
})
export class I18nCatalogModule {}
