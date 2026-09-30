import { Module } from '@nestjs/common';

import { I18nCatalogModule } from '../i18n/i18n-catalog.module.js';
import { CsrfService } from './csrf.service.js';

@Module({
  imports: [I18nCatalogModule],
  providers: [CsrfService],
  exports: [CsrfService],
})
export class CsrfModule {}
