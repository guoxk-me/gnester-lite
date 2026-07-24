import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthGuard } from './auth.guard';
import { AuthTokenService } from './auth-token.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { PasswordHashService } from './password-hash.service';
import { JwtStrategy } from './strategies/jwt.strategy';

type JwtExpiresIn = NonNullable<JwtModuleOptions['signOptions']>['expiresIn'];

// CN: 认证模块提供 JWT、Passport 守卫和密码哈希；EN: Auth module provides JWT, Passport guards, and password hashing.
// AI modified: registered PassportModule and JwtStrategy so JwtAuthGuard works per NestJS passport recipe.
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'gnester-lite-local-jwt-secret',
        signOptions: {
          expiresIn: configService.get<string>(
            'JWT_ACCESS_TOKEN_TTL',
            '15m',
          ) as JwtExpiresIn,
          issuer: configService.get<string>('JWT_ISSUER', 'gnester-lite'),
          audience: configService.get<string>('JWT_AUDIENCE', 'gnester-lite'),
        },
      }),
    }),
  ],
  providers: [
    AuthGuard,
    AuthTokenService,
    JwtAuthGuard,
    JwtStrategy,
    LocalAuthGuard,
    PasswordHashService,
  ],
  exports: [
    AuthGuard,
    AuthTokenService,
    JwtAuthGuard,
    JwtModule,
    LocalAuthGuard,
    PassportModule,
    PasswordHashService,
  ],
})
export class CommonAuthModule {}
