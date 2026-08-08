import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';

import { Environment } from 'config/config.types';
import { DemoCookieReadDto } from './dto/demo-cookie-read.dto';
import { DemoCookieWriteDto } from './dto/demo-cookie-write.dto';
import { SetDemoPreferenceCookieDto } from './dto/set-demo-preference-cookie.dto';

export const DEMO_PREFERENCES_COOKIE = 'demo_preferences';
export const DEMO_SESSION_COOKIE = 'demo_session';

const PREFERENCES_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const SESSION_COOKIE_MAX_AGE = 15 * 60 * 1000;

interface CookieSetDefinition {
  readonly name: string;
  readonly value: unknown;
  readonly options: CookieOptions;
  readonly dto: DemoCookieWriteDto;
}

@Injectable()
export class DemoCookiesService {
  constructor(private readonly configService: ConfigService) {}

  read(
    cookies: Record<string, unknown> | undefined,
    name?: string,
  ): DemoCookieReadDto {
    if (name) {
      if (name !== DEMO_PREFERENCES_COOKIE) {
        throw new BadRequestException(
          `Only ${DEMO_PREFERENCES_COOKIE} may be read by this demo.`,
        );
      }

      const value = cookies?.[DEMO_PREFERENCES_COOKIE];

      return {
        name: DEMO_PREFERENCES_COOKIE,
        found: value !== undefined,
        value: value ?? null,
      };
    }

    // AI modified: never reflect unrelated or httpOnly security cookies into response JSON.
    const readableCookies =
      cookies?.[DEMO_PREFERENCES_COOKIE] === undefined
        ? {}
        : {
            [DEMO_PREFERENCES_COOKIE]: cookies[DEMO_PREFERENCES_COOKIE],
          };

    return {
      found: Object.keys(readableCookies).length > 0,
      value: readableCookies,
    };
  }

  createPreferencesCookie(
    dto: SetDemoPreferenceCookieDto,
  ): CookieSetDefinition {
    const options = this.createBaseCookieOptions({
      httpOnly: false,
      maxAge: PREFERENCES_COOKIE_MAX_AGE,
      signed: false,
    });

    return {
      name: DEMO_PREFERENCES_COOKIE,
      value: {
        theme: dto.theme,
        locale: dto.locale ?? 'zh-CN',
      },
      options,
      dto: {
        name: DEMO_PREFERENCES_COOKIE,
        action: 'set',
        httpOnly: options.httpOnly ?? false,
        secure: options.secure ?? false,
        sameSite: options.sameSite ?? false,
        path: options.path ?? '/',
        maxAge: options.maxAge,
        signed: options.signed ?? false,
      },
    };
  }

  createSignedSessionCookie(
    requestSecret: string | undefined,
  ): CookieSetDefinition {
    if (!requestSecret) {
      throw new ServiceUnavailableException(
        'COOKIE_SECRET is required before setting signed cookies.',
      );
    }

    const options = this.createBaseCookieOptions({
      httpOnly: true,
      maxAge: SESSION_COOKIE_MAX_AGE,
      path: '/demo-cookies',
      signed: true,
    });

    return {
      name: DEMO_SESSION_COOKIE,
      value: 'signed-demo-session',
      options,
      dto: {
        name: DEMO_SESSION_COOKIE,
        action: 'set',
        httpOnly: options.httpOnly ?? false,
        secure: options.secure ?? false,
        sameSite: options.sameSite ?? false,
        path: options.path ?? '/',
        maxAge: options.maxAge,
        signed: options.signed ?? false,
      },
    };
  }

  createClearSessionCookie(): Omit<CookieSetDefinition, 'value'> {
    // AI modified: Express 5 must not try to sign the empty clear-cookie value when no request secret exists.
    const options = this.createBaseCookieOptions({
      httpOnly: true,
      path: '/demo-cookies',
    });

    return {
      name: DEMO_SESSION_COOKIE,
      options,
      dto: {
        name: DEMO_SESSION_COOKIE,
        action: 'clear',
        httpOnly: options.httpOnly ?? false,
        secure: options.secure ?? false,
        sameSite: options.sameSite ?? false,
        path: options.path ?? '/',
        maxAge: options.maxAge,
        // The cleared browser value was originally a signed cookie.
        signed: true,
      },
    };
  }

  private createBaseCookieOptions(
    overrides: CookieOptions = {},
  ): CookieOptions {
    const nodeEnv = this.configService.get<Environment>(
      'NODE_ENV',
      Environment.Development,
    );

    return {
      httpOnly: true,
      maxAge: SESSION_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      secure: nodeEnv === Environment.Production,
      ...overrides,
    };
  }
}
