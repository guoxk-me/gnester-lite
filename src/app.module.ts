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
import { BetterAuthModule } from './better-auth/better-auth.module';
import { CsrfModule } from './csrf/csrf.module';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './logger/logger.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { I18nModule } from './i18n/i18n.module';
import { SentryModule } from './sentry/sentry.module';
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
    BetterAuthModule,
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
