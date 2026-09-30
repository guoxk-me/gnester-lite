import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import { createPinoLoggerParams } from './logger.config.js';

// AI modified: wraps nestjs-pino so platform logging uses Pino with DI config.
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createPinoLoggerParams,
    }),
  ],
})
export class LoggerModule {}
