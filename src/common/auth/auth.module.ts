import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthGuard } from './auth.guard';
import { AuthTokenService } from './auth-token.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { readJwtPolicy } from './jwt-policy';
import { PasswordHashService } from './password-hash.service';
import { JwtStrategy } from './strategies/jwt.strategy';

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
