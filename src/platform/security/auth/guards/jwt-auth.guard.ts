import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// AI modified: added Passport JwtAuthGuard per NestJS passport recipe.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
