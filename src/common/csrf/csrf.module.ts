import { Module } from '@nestjs/common';

import { CsrfService } from './csrf.service';

// CN: CSRF 模块防护跨站请求伪造；EN: CSRF module protects against cross-site request forgery.
@Module({
  providers: [CsrfService],
  exports: [CsrfService],
})
export class CommonCsrfModule {}
