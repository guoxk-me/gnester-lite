import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { DemoAuthService } from './demo-auth.service';
import {
  DEMO_AUTH_PASSWORD_MAX_LENGTH,
  DEMO_AUTH_USERNAME_MAX_LENGTH,
} from './dto/sign-in.dto';
import type { LocalAuthenticatedUser } from './local-authenticated-user.type';

// AI modified: added Passport LocalStrategy per NestJS passport recipe.
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly demoAuthService: DemoAuthService) {
    super();
  }

  async validate(
    username: string,
    password: string,
  ): Promise<LocalAuthenticatedUser> {
    // AI modified: reject oversized credentials before the scrypt verifier consumes CPU.
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      username.length > DEMO_AUTH_USERNAME_MAX_LENGTH ||
      password.length > DEMO_AUTH_PASSWORD_MAX_LENGTH
    ) {
      throw new UnauthorizedException();
    }

    const user = await this.demoAuthService.validateUser(username, password);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
