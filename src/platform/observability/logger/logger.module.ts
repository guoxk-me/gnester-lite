import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { createPinoLoggerParams } from './logger.config';

// AI modified: wraps nestjs-pino so platform logging uses Pino with DI config.
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createPinoLoggerParams,
    }),
  ],
})
export class CommonLoggerModule {}
