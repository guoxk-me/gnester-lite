// CN: Passport local 守卫，保护登录路由；EN: Passport local guard for login routes.
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// AI modified: added Passport LocalAuthGuard per NestJS passport recipe.
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
