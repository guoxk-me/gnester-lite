import { Module } from '@nestjs/common';

import { CommonCsrfModule } from '../../platform/security/csrf/csrf.module';
import { DemoCsrfController } from './demo-csrf.controller';
import { DemoCsrfService } from './demo-csrf.service';

@Module({
  imports: [CommonCsrfModule],
  controllers: [DemoCsrfController],
  providers: [DemoCsrfService],
})
export class DemoCsrfModule {}
