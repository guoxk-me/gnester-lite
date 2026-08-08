import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';

import { I18N_FALLBACK_LANGUAGE } from './i18n.constants';

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
      resolvers: [AcceptLanguageResolver],
    }),
  ],
  exports: [I18nModule],
})
export class I18nCatalogModule {}
