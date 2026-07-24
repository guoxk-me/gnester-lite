// CN: 控制器，定义 demo-auth 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-auth.
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

import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Public } from '../../common/auth/decorators/public.decorator';
import { AccessTokenDto } from '../../common/auth/dto/access-token.dto';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { LocalAuthGuard } from '../../common/auth/guards/local-auth.guard';
import type { JwtAuthenticatedUser } from '../../common/auth/types/jwt-authenticated-user.type';
import type { LocalAuthenticatedUser } from '../../common/auth/types/local-authenticated-user.type';
import { DemoAuthService } from './demo-auth.service';
import { DemoAuthScenarioDto } from './dto/demo-auth-scenario.dto';
import { SignInDto } from './dto/sign-in.dto';

interface LocalAuthenticatedRequest {
  user: LocalAuthenticatedUser;
}

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-auth',
})
export class DemoAuthController {
  // CN: 初始化 demo-auth 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-auth.
  constructor(private readonly demoAuthService: DemoAuthService) {}

  // CN: 处理 demo-auth 的 get scenarios HTTP 请求；EN: Handles the get scenarios HTTP request for demo-auth.
  @Public()
  @Get('scenarios')
  getScenarios(): DemoAuthScenarioDto[] {
    return this.demoAuthService.getScenarios();
  }

  // AI modified: login uses LocalAuthGuard so Passport local strategy validates body credentials.
  // CN: 处理 demo-auth 的 sign in HTTP 请求；EN: Handles the sign in HTTP request for demo-auth.
  @Public()
  @UseGuards(LocalAuthGuard)
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
  // CN: 处理 demo-auth 的 get profile HTTP 请求；EN: Handles the get profile HTTP request for demo-auth.
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: JwtAuthenticatedUser): JwtAuthenticatedUser {
    return this.demoAuthService.getProfile(user);
  }
}
