import { Global, Module } from '@nestjs/common';
import { SystemLoggerService } from './logger.service';

// AI modified: exposes the application logger as a shared platform provider.
@Global()
@Module({
  providers: [SystemLoggerService],
  exports: [SystemLoggerService],
})
export class CommonLoggerModule {}
