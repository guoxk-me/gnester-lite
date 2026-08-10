import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// AI modified: added Passport LocalAuthGuard per NestJS passport recipe.
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
