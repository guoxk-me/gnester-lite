import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration.js';
import { databaseConfig } from './config/database.config.js';
import { shouldEnableDemos } from './config/demo-catalog.js';
import { environmentFilePaths } from './config/environment-files.js';
import { validate } from './config/validation.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { BetterAuthModule } from './better-auth/better-auth.module.js';
import { CsrfModule } from './infra/csrf/csrf.module.js';
import { HealthModule } from './health/health.module.js';
import { LoggerModule } from './logger/logger.module.js';
import { RateLimitModule } from './infra/rate-limit/rate-limit.module.js';
import { HttpResponseModule as I18nModule } from './infra/http/http-response.module.js';
import { SentryModule } from './sentry/sentry.module.js';
import { UserManagementModule } from './user-management/user-management.module.js';
import { DemosModule } from './examples/demos.module.js';

const demoImports = shouldEnableDemos(process.env.NODE_ENV)
  ? [DemosModule]
  : [];

// AI modified: Demo modules remain outside the production graph after the ESM migration.
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
    BetterAuthModule,
    UserManagementModule,
    SentryModule,
    I18nModule,
    CsrfModule,
    HealthModule,
    LoggerModule,
    RateLimitModule,
    // AI modified: optional infrastructure is composed inside the feature that consumes it.
    ...demoImports,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
