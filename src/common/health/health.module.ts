import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';

// CN: 健康检查模块服务部署探针；EN: Health module serves deployment probes.
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class CommonHealthModule {}
