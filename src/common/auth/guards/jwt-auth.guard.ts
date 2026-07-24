// CN: Passport JWT 守卫，保护需要 Bearer token 的路由；EN: Passport JWT guard for Bearer-protected routes.
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// AI modified: added Passport JwtAuthGuard per NestJS passport recipe.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
