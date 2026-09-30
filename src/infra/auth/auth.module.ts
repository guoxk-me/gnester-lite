import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthGuard } from './auth.guard.js';
import { AuthTokenService } from './auth-token.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { readJwtPolicy } from './jwt-policy.js';
import { PasswordHashService } from './password-hash.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

// AI modified: registered PassportModule and JwtStrategy so JwtAuthGuard works per NestJS passport recipe.
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const policy = readJwtPolicy(configService);

        return {
          secret: policy.secret,
          signOptions: {
            algorithm: policy.algorithm,
            expiresIn: policy.accessTokenTtl,
            issuer: policy.issuer,
            audience: policy.audience,
          },
          verifyOptions: {
            algorithms: [policy.algorithm],
            issuer: policy.issuer,
            audience: policy.audience,
          },
        };
      },
    }),
  ],
  providers: [
    AuthGuard,
    AuthTokenService,
    JwtAuthGuard,
    JwtStrategy,
    PasswordHashService,
  ],
  exports: [
    AuthGuard,
    AuthTokenService,
    JwtAuthGuard,
    JwtModule,
    PassportModule,
    PasswordHashService,
  ],
})
export class AuthModule {}
