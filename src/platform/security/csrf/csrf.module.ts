import { Module } from '@nestjs/common';

import { I18nCatalogModule } from '../../runtime/i18n/i18n-catalog.module';
import { CsrfService } from './csrf.service';

@Module({
  imports: [I18nCatalogModule],
  providers: [CsrfService],
  exports: [CsrfService],
})
export class CommonCsrfModule {}
