import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../../platform/security/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../platform/security/auth/guards/jwt-auth.guard';
import type { JwtAuthenticatedUser } from '../../platform/security/auth/types/jwt-authenticated-user.type';
import { DemoAuthService } from './demo-auth.service';
import { AccessTokenDto } from './dto/access-token.dto';
import { DemoAuthProfileDto } from './dto/demo-auth-profile.dto';
import { DemoAuthScenarioDto } from './dto/demo-auth-scenario.dto';
import { SignInDto } from './dto/sign-in.dto';
import { LocalAuthGuard } from './local-auth.guard';
import type { LocalAuthenticatedUser } from './local-authenticated-user.type';

interface LocalAuthenticatedRequest {
  user: LocalAuthenticatedUser;
}

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-auth',
})
// AI modified: explicit Passport guards do not use AuthGuard-only public metadata.
export class DemoAuthController {
  constructor(private readonly demoAuthService: DemoAuthService) {}

  @Get('scenarios')
  getScenarios(): DemoAuthScenarioDto[] {
    return this.demoAuthService.getScenarios();
  }

  // AI modified: login uses LocalAuthGuard so Passport local strategy validates body credentials.
  @UseGuards(LocalAuthGuard)
  // AI modified: credential verification has a stricter per-client attempt budget.
  @Throttle({
    short: { limit: 5, ttl: 60_000, blockDuration: 60_000 },
  })
  @ApiBody({ type: SignInDto })
  @ApiOkResponse({ type: AccessTokenDto })
  @ApiBadRequestResponse({ description: 'Invalid credential payload' })
  @ApiUnauthorizedResponse({ description: 'Invalid username or password' })
  @ApiTooManyRequestsResponse({ description: 'Login attempt budget exceeded' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(
    // SignInDto documents the body contract; LocalAuthGuard reads username/password from req.body.
    @Body() _dto: SignInDto,
    @Req() req: LocalAuthenticatedRequest,
  ): Promise<AccessTokenDto> {
    return this.demoAuthService.login(req.user);
  }

  // AI modified: profile uses JwtAuthGuard + JwtStrategy instead of the hand-rolled AuthGuard.
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Validated JWT identity',
    type: DemoAuthProfileDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @Get('profile')
  getProfile(@CurrentUser() user: JwtAuthenticatedUser): DemoAuthProfileDto {
    return this.demoAuthService.getProfile(user);
  }
}
