// CN: Passport local 策略，用 DemoAuthService 校验用户名密码；EN: Passport local strategy validates credentials via DemoAuthService.
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import type { LocalAuthenticatedUser } from '../../common/auth/types/local-authenticated-user.type';
import { DemoAuthService } from './demo-auth.service';

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
    const user = await this.demoAuthService.validateUser(username, password);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
