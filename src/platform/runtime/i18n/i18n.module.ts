import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { ApiEnvelopeInterceptor } from './api-envelope.interceptor';
import { ApiExceptionFilter } from './api-exception.filter';
import { I18nCatalogModule } from './i18n-catalog.module';

// AI modified: application-wide envelope + nestjs-i18n catalog composed for AppModule.
@Module({
  imports: [I18nCatalogModule],
  providers: [
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
export class CommonI18nModule {}
