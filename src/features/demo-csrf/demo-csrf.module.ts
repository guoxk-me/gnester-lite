import { Module } from '@nestjs/common';

import { CommonCsrfModule } from '../../common/csrf/csrf.module';
import { DemoCsrfController } from './demo-csrf.controller';
import { DemoCsrfService } from './demo-csrf.service';

// CN: 演示 CSRF 令牌和受保护操作；EN: Demonstrates CSRF tokens and protected actions.
@Module({
  imports: [CommonCsrfModule],
  controllers: [DemoCsrfController],
  providers: [DemoCsrfService],
})
export class DemoCsrfModule {}
