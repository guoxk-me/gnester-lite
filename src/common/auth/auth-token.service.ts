// CN: 服务，承载 auth common 的业务逻辑；EN: Service holds business logic for auth common.
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { JwtAuthenticatedUser } from './types/jwt-authenticated-user.type';

export type AccessTokenPayload = Pick<
  JwtAuthenticatedUser,
  'sub' | 'username' | 'roles' | 'permissions'
>;

@Injectable()
export class AuthTokenService {
  // CN: 初始化 auth common 的依赖和运行状态；EN: Initializes dependencies and runtime state for auth common.
  constructor(private readonly jwtService: JwtService) {}

  // CN: 执行 auth common 的 sign access token 业务逻辑；EN: Runs the sign access token business logic for auth common.
  signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }
}
