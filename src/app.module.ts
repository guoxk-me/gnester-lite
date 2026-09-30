import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApplicationModule } from './modules/application.module.js';
import configuration from './config/configuration.js';
import { databaseConfig } from './infra/database/database.config.js';
import { environmentFilePaths } from './config/environment-files.js';
import { validate } from './config/validation.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CsrfModule } from './infra/csrf/csrf.module.js';
import { HealthModule } from './infra/health/health.module.js';
import { LoggerModule } from './infra/logger/logger.module.js';
import { RateLimitModule } from './infra/rate-limit/rate-limit.module.js';
import { HttpResponseModule } from './infra/http/http-response.module.js';
import { SentryModule } from './infra/sentry/sentry.module.js';

// AI modified: infrastructure and replaceable application modules are composed explicitly.
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      ignoreEnvFile: false,
      envFilePath: environmentFilePaths(),
      isGlobal: true,
      cache: true,
      validate,
    }),
    TypeOrmModule.forRootAsync(databaseConfig.asProvider()),
    ApplicationModule,
    SentryModule,
    HttpResponseModule,
    CsrfModule,
    HealthModule,
    LoggerModule,
    RateLimitModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
