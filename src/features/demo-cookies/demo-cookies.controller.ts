// CN: 控制器，定义 demo-cookies 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-cookies.
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { Cookies } from './decorators/cookies.decorator';
import { DemoCookieReadDto } from './dto/demo-cookie-read.dto';
import { DemoCookieWriteDto } from './dto/demo-cookie-write.dto';
import { SetDemoPreferenceCookieDto } from './dto/set-demo-preference-cookie.dto';
import { DemoCookiesService } from './demo-cookies.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-cookies',
})
export class DemoCookiesController {
  // CN: 初始化 demo-cookies 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-cookies.
  constructor(private readonly demoCookiesService: DemoCookiesService) {}

  // CN: 处理 demo-cookies 的 read all HTTP 请求；EN: Handles the read all HTTP request for demo-cookies.
  @Get()
  readAll(
    @Cookies() cookies: Record<string, unknown> | undefined,
  ): DemoCookieReadDto {
    return this.demoCookiesService.read(cookies);
  }

  // CN: 处理 demo-cookies 的 read one HTTP 请求；EN: Handles the read one HTTP request for demo-cookies.
  @Get(':name')
  readOne(
    @Param('name') name: string,
    @Cookies() cookies: Record<string, unknown> | undefined,
  ): DemoCookieReadDto {
    return this.demoCookiesService.read(cookies, name);
  }

  // CN: 处理 demo-cookies 的 set preferences HTTP 请求；EN: Handles the set preferences HTTP request for demo-cookies.
  @Post('preferences')
  setPreferences(
    @Body() dto: SetDemoPreferenceCookieDto,
    @Res({ passthrough: true }) response: Response,
  ): DemoCookieWriteDto {
    const cookie = this.demoCookiesService.createPreferencesCookie(dto);

    response.cookie(cookie.name, cookie.value, cookie.options);

    return cookie.dto;
  }

  // CN: 处理 demo-cookies 的 set signed session HTTP 请求；EN: Handles the set signed session HTTP request for demo-cookies.
  @Post('session')
  setSignedSession(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): DemoCookieWriteDto {
    const cookie = this.demoCookiesService.createSignedSessionCookie(
      request.secret,
    );

    response.cookie(cookie.name, cookie.value, cookie.options);

    return cookie.dto;
  }

  // CN: 处理 demo-cookies 的 clear signed session HTTP 请求；EN: Handles the clear signed session HTTP request for demo-cookies.
  @Delete('session')
  clearSignedSession(
    @Res({ passthrough: true }) response: Response,
  ): DemoCookieWriteDto {
    const cookie = this.demoCookiesService.createClearSessionCookie();

    response.clearCookie(cookie.name, cookie.options);

    return cookie.dto;
  }
}
