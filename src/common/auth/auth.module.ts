import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';

import { AuthGuard } from './auth.guard';
import { AuthTokenService } from './auth-token.service';
import { PasswordHashService } from './password-hash.service';

type JwtExpiresIn = NonNullable<JwtModuleOptions['signOptions']>['expiresIn'];

// CN: 认证模块提供 JWT、守卫和密码哈希；EN: Auth module provides JWT, guard, and password hashing.
@Module({
  imports: [
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
  providers: [AuthGuard, AuthTokenService, PasswordHashService],
  exports: [AuthGuard, AuthTokenService, PasswordHashService, JwtModule],
})
export class CommonAuthModule {}
