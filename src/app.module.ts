import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from 'config/configuration';
import { databaseConfig } from 'config/database.config';
import { shouldEnableDemos } from 'config/demo-catalog';
import { environmentFilePaths } from 'config/environment-files';
import { validate } from 'config/validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonBetterAuthModule } from './platform/security/better-auth/better-auth.module';
import { CommonCsrfModule } from './platform/security/csrf/csrf.module';
import { CommonHealthModule } from './platform/operations/health/health.module';
import { CommonLoggerModule } from './platform/observability/logger/logger.module';
import { CommonRateLimitModule } from './platform/security/rate-limit/rate-limit.module';
import { CommonSentryModule } from './platform/observability/sentry/sentry.module';
import { DemosModule } from './examples/demos.module';

const demoImports = shouldEnableDemos(process.env.NODE_ENV)
  ? [DemosModule]
  : [];

// AI modified: compose the platform and removable demo catalog at explicit module boundaries.
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
    CommonBetterAuthModule,
    CommonSentryModule,
    CommonCsrfModule,
    CommonHealthModule,
    CommonLoggerModule,
    CommonRateLimitModule,
    // AI modified: optional infrastructure is composed inside the feature that consumes it.
    ...demoImports,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
