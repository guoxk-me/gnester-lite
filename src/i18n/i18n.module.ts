import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import {
  ApiEnvelopeBoundaryGuard,
  ApiEnvelopeInterceptor,
} from './api-envelope.interceptor.js';
import { ApiExceptionFilter } from './api-exception.filter.js';
import { I18nCatalogModule } from './i18n-catalog.module.js';

// AI modified: application-wide envelope + nestjs-i18n catalog composed for AppModule.
@Module({
  imports: [I18nCatalogModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiEnvelopeBoundaryGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiEnvelopeInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
  ],
  exports: [I18nCatalogModule],
})
export class I18nModule {}
