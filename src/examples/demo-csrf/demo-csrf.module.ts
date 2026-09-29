import { Module } from '@nestjs/common';

import { CsrfModule } from '../../csrf/csrf.module.js';
import { DemoCsrfController } from './demo-csrf.controller.js';
import { DemoCsrfService } from './demo-csrf.service.js';

@Module({
  imports: [CsrfModule],
  controllers: [DemoCsrfController],
  providers: [DemoCsrfService],
})
export class DemoCsrfModule {}
