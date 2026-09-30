import { ApiCookieAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import type { Request, Response } from 'express';

import { SignInBody } from './dto/session.dto.js';
import type { SessionUser } from './session.types.js';
import { CsrfService } from '../../infra/csrf/csrf.service.js';
import { ApplicationAuthService } from './application-auth.service.js';

@Controller({ path: 'session', version: VERSION_NEUTRAL })
export class SessionController {
  constructor(
    private readonly auth: ApplicationAuthService,
    private readonly csrf: CsrfService,
  ) {}

  @Get()
  @ApiCookieAuth('application-session')
  @ApiUnauthorizedResponse({
    description: 'The application session is missing or expired',
  })
  async getSession(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionUser> {
    // AI modified: unauthenticated session checks still seed Axios's CSRF cookie before login.
    if (this.csrf.isEnabled()) this.csrf.createToken(request, response);
    return this.auth.requireUser(request);
  }

  @Post('login')
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or disabled account',
  })
  @HttpCode(200)
  // AI modified: credential guesses need a tighter limit than ordinary reads.
  @Throttle({ short: { limit: 5, ttl: 60_000 } })
  signIn(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() credentials: SignInBody,
  ): Promise<SessionUser> {
    return this.auth.signIn(
      credentials.email,
      credentials.password,
      credentials.rememberMe === true,
      request,
      response,
    );
  }

  @Post('refresh')
  @ApiCookieAuth('application-refresh')
  @ApiUnauthorizedResponse({
    description: 'The refresh session is missing or expired',
  })
  @HttpCode(200)
  refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionUser> {
    return this.auth.refresh(request, response);
  }

  @Post('logout')
  @HttpCode(200)
  async signOut(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<null> {
    await this.auth.signOut(request, response);
    return null;
  }
}
