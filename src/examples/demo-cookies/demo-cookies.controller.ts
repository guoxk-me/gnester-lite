import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Req,
  Res,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiResponse, type ApiResponseOptions } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { Cookies } from './decorators/cookies.decorator';
import { DemoCookieReadDto } from './dto/demo-cookie-read.dto';
import { DemoCookieWriteDto } from './dto/demo-cookie-write.dto';
import { SetDemoPreferenceCookieDto } from './dto/set-demo-preference-cookie.dto';
import { DemoCookiesService } from './demo-cookies.service';

// AI modified: cookie and cache headers are observable parts of these HTTP responses.
const demoCookieReadResponse: ApiResponseOptions = {
  status: 200,
  type: DemoCookieReadDto,
  headers: {
    'Cache-Control': {
      description:
        'Prevents shared or browser caches from retaining cookie data',
      schema: { type: 'string', example: 'private, no-store' },
    },
  },
};

const demoCookieCreatedResponse: ApiResponseOptions = {
  status: 201,
  type: DemoCookieWriteDto,
  headers: {
    'Set-Cookie': {
      description: 'Creates the preference or signed demo-session cookie',
      schema: {
        type: 'string',
        example:
          'demo_session=value; Path=/demo-cookies; HttpOnly; SameSite=Lax',
      },
    },
  },
};

const demoCookieClearedResponse: ApiResponseOptions = {
  status: 200,
  type: DemoCookieWriteDto,
  headers: {
    'Set-Cookie': {
      description: 'Expires the signed demo-session cookie',
      schema: {
        type: 'string',
        example:
          'demo_session=; Path=/demo-cookies; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax',
      },
    },
  },
};

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-cookies',
})
export class DemoCookiesController {
  constructor(private readonly demoCookiesService: DemoCookiesService) {}

  @Get()
  // AI modified: cookie-derived preferences are private browser state.
  @Header('Cache-Control', 'private, no-store')
  @ApiResponse(demoCookieReadResponse)
  readAll(
    @Cookies() cookies: Record<string, unknown> | undefined,
  ): DemoCookieReadDto {
    return this.demoCookiesService.read(cookies);
  }

  @Get(':name')
  // AI modified: named cookie reads must not be served across users by a cache.
  @Header('Cache-Control', 'private, no-store')
  @ApiResponse({
    status: 400,
    description: 'Only the allowlisted preference cookie may be read',
  })
  @ApiResponse(demoCookieReadResponse)
  readOne(
    @Param('name') name: string,
    @Cookies() cookies: Record<string, unknown> | undefined,
  ): DemoCookieReadDto {
    return this.demoCookiesService.read(cookies, name);
  }

  @Post('preferences')
  @ApiResponse({
    status: 400,
    description: 'Preference cookie settings failed validation',
  })
  @ApiResponse(demoCookieCreatedResponse)
  setPreferences(
    @Body() dto: SetDemoPreferenceCookieDto,
    @Res({ passthrough: true }) response: Response,
  ): DemoCookieWriteDto {
    const cookie = this.demoCookiesService.createPreferencesCookie(dto);

    response.cookie(cookie.name, cookie.value, cookie.options);

    return cookie.dto;
  }

  @Post('session')
  @ApiResponse({
    status: 503,
    description:
      'Cookie signing is unavailable because no secret is configured',
  })
  @ApiResponse(demoCookieCreatedResponse)
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

  @Delete('session')
  @ApiResponse(demoCookieClearedResponse)
  clearSignedSession(
    @Res({ passthrough: true }) response: Response,
  ): DemoCookieWriteDto {
    const cookie = this.demoCookiesService.createClearSessionCookie();

    response.clearCookie(cookie.name, cookie.options);

    return cookie.dto;
  }
}
