import { Module } from '@nestjs/common';

import { CsrfModule } from '../../csrf/csrf.module';
import { DemoCsrfController } from './demo-csrf.controller';
import { DemoCsrfService } from './demo-csrf.service';

@Module({
  imports: [CsrfModule],
  controllers: [DemoCsrfController],
  providers: [DemoCsrfService],
})
export class DemoCsrfModule {}
