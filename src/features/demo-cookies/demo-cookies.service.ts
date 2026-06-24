// CN: 服务，承载 demo-cookies 的业务逻辑；EN: Service holds business logic for demo-cookies.
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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
  // CN: 初始化 demo-cookies 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-cookies.
  constructor(private readonly configService: ConfigService) {}

  // CN: 执行 demo-cookies 的 read 业务逻辑；EN: Runs the read business logic for demo-cookies.
  read(
    cookies: Record<string, unknown> | undefined,
    name?: string,
  ): DemoCookieReadDto {
    if (name) {
      const value = cookies?.[name];

      return {
        name,
        found: value !== undefined,
        value: value ?? null,
      };
    }

    return {
      found: Object.keys(cookies ?? {}).length > 0,
      value: cookies ?? {},
    };
  }

  // CN: 执行 demo-cookies 的 create preferences cookie 业务逻辑；EN: Runs the create preferences cookie business logic for demo-cookies.
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
      dto: this.toWriteDto(DEMO_PREFERENCES_COOKIE, 'set', options),
    };
  }

  // CN: 执行 demo-cookies 的 create signed session cookie 业务逻辑；EN: Runs the create signed session cookie business logic for demo-cookies.
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
      dto: this.toWriteDto(DEMO_SESSION_COOKIE, 'set', options),
    };
  }

  // CN: 执行 demo-cookies 的 create clear session cookie 业务逻辑；EN: Runs the create clear session cookie business logic for demo-cookies.
  createClearSessionCookie(): Omit<CookieSetDefinition, 'value'> {
    const options = this.createBaseCookieOptions({
      httpOnly: true,
      path: '/demo-cookies',
      signed: true,
    });

    return {
      name: DEMO_SESSION_COOKIE,
      options,
      dto: this.toWriteDto(DEMO_SESSION_COOKIE, 'clear', options),
    };
  }

  // CN: 执行 demo-cookies 的 create base cookie options 业务逻辑；EN: Runs the create base cookie options business logic for demo-cookies.
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

  // CN: 执行 demo-cookies 的 to write dto 业务逻辑；EN: Runs the to write dto business logic for demo-cookies.
  private toWriteDto(
    name: string,
    action: DemoCookieWriteDto['action'],
    options: CookieOptions,
  ): DemoCookieWriteDto {
    return {
      name,
      action,
      httpOnly: options.httpOnly ?? false,
      secure: options.secure ?? false,
      sameSite: options.sameSite ?? false,
      path: options.path ?? '/',
      maxAge: options.maxAge,
      signed: options.signed ?? false,
    };
  }
}
