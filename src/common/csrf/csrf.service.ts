// CN: 服务，承载 csrf common 的业务逻辑；EN: Service holds business logic for csrf common.
import { randomUUID } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { doubleCsrf, type DoubleCsrfConfigOptions } from 'csrf-csrf';
import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from 'express';

import { Environment } from 'config/config.types';

export const CSRF_LOCAL_DEVELOPMENT_SECRET =
  'gnester-lite-local-csrf-secret-change-me';

type CsrfSameSite = 'lax' | 'strict' | 'none';

export interface CsrfTokenResponse {
  readonly csrfToken: string;
  readonly headerName: string;
}

// CN: 执行 csrf common 的 read cookie 业务逻辑；EN: Runs the read cookie business logic for csrf common.
function readCookie(request: Request, name: string): string | undefined {
  const signedCookies = request.signedCookies as
    | Record<string, unknown>
    | undefined;
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = signedCookies?.[name] ?? cookies?.[name];

  return typeof value === 'string' ? value : undefined;
}

// CN: 执行 csrf common 的 resolve node env 业务逻辑；EN: Runs the resolve node env business logic for csrf common.
function resolveNodeEnv(
  configService: Pick<ConfigService, 'get'>,
): Environment {
  return configService.get<Environment>('NODE_ENV', Environment.Development);
}

// CN: 执行 csrf common 的 resolve token cookie name 业务逻辑；EN: Runs the resolve token cookie name business logic for csrf common.
function resolveTokenCookieName(
  configService: Pick<ConfigService, 'get'>,
  nodeEnv: Environment,
): string {
  const configuredName = configService.get<string>('CSRF_COOKIE_NAME');

  if (
    nodeEnv === Environment.Production &&
    (!configuredName || configuredName === 'gnester.csrf-token')
  ) {
    return '__Host-gnester.csrf-token';
  }

  return configuredName || 'gnester.csrf-token';
}

// CN: 执行 csrf common 的 resolve identifier cookie name 业务逻辑；EN: Runs the resolve identifier cookie name business logic for csrf common.
function resolveIdentifierCookieName(
  configService: Pick<ConfigService, 'get'>,
  nodeEnv: Environment,
): string {
  const configuredName = configService.get<string>(
    'CSRF_IDENTIFIER_COOKIE_NAME',
  );

  if (
    nodeEnv === Environment.Production &&
    (!configuredName || configuredName === 'gnester.csrf-id')
  ) {
    return '__Host-gnester.csrf-id';
  }

  return configuredName || 'gnester.csrf-id';
}

// CN: 执行 csrf common 的 resolve cookie secure 业务逻辑；EN: Runs the resolve cookie secure business logic for csrf common.
function resolveCookieSecure(
  configService: Pick<ConfigService, 'get'>,
  nodeEnv: Environment,
): boolean {
  return configService.get<boolean>(
    'CSRF_COOKIE_SECURE',
    nodeEnv === Environment.Production,
  );
}

// CN: 执行 csrf common 的 resolve cookie same site 业务逻辑；EN: Runs the resolve cookie same site business logic for csrf common.
function resolveCookieSameSite(
  configService: Pick<ConfigService, 'get'>,
): CsrfSameSite {
  return configService.get<CsrfSameSite>('CSRF_COOKIE_SAME_SITE', 'lax');
}

// CN: 执行 csrf common 的 create csrf options 业务逻辑；EN: Runs the create csrf options business logic for csrf common.
export function createCsrfOptions(
  configService: Pick<ConfigService, 'get'>,
  nodeEnv: Environment,
): DoubleCsrfConfigOptions {
  const tokenCookieName = resolveTokenCookieName(configService, nodeEnv);
  const identifierCookieName = resolveIdentifierCookieName(
    configService,
    nodeEnv,
  );
  const headerName = configService.get<string>(
    'CSRF_HEADER_NAME',
    'x-csrf-token',
  );
  const secret =
    configService.get<string>('CSRF_SECRET') || CSRF_LOCAL_DEVELOPMENT_SECRET;
  const secure = resolveCookieSecure(configService, nodeEnv);
  const sameSite = resolveCookieSameSite(configService);

  return {
    getSecret: () => secret,
    getSessionIdentifier: (request: Request) =>
      readCookie(request, identifierCookieName) || request.sessionID || '',
    cookieName: tokenCookieName,
    cookieOptions: {
      httpOnly: true,
      path: '/',
      sameSite,
      secure,
    },
    errorConfig: {
      statusCode: 403,
      message: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID',
    },
    getCsrfTokenFromRequest: (request: Request) => {
      const headerValue = request.headers[headerName.toLowerCase()];

      return Array.isArray(headerValue) ? headerValue[0] : headerValue;
    },
  };
}

@Injectable()
export class CsrfService {
  private readonly nodeEnv: Environment;
  private readonly utilities: ReturnType<typeof doubleCsrf>;

  // CN: 初始化 csrf common 的依赖和运行状态；EN: Initializes dependencies and runtime state for csrf common.
  constructor(private readonly configService: ConfigService) {
    this.nodeEnv = resolveNodeEnv(configService);
    this.utilities = doubleCsrf(createCsrfOptions(configService, this.nodeEnv));
  }

  // CN: 执行 csrf common 的 is enabled 业务逻辑；EN: Runs the is enabled business logic for csrf common.
  isEnabled(): boolean {
    return this.configService.get<boolean>('CSRF_ENABLED', true);
  }

  // CN: 执行 csrf common 的 get header name 业务逻辑；EN: Runs the get header name business logic for csrf common.
  getHeaderName(): string {
    return this.configService.get<string>('CSRF_HEADER_NAME', 'x-csrf-token');
  }

  // CN: 执行 csrf common 的 create token 业务逻辑；EN: Runs the create token business logic for csrf common.
  createToken(request: Request, response: Response): string {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException('CSRF protection is disabled.');
    }

    this.ensureIdentifierCookie(request, response);

    return this.utilities.generateCsrfToken(request, response);
  }

  // CN: 执行 csrf common 的 create protection middleware 业务逻辑；EN: Runs the create protection middleware business logic for csrf common.
  createProtectionMiddleware(): (
    request: Request,
    response: Response,
    next: NextFunction,
  ) => void {
    return (request: Request, response: Response, next: NextFunction) => {
      if (!this.isEnabled()) {
        next();
        return;
      }

      this.utilities.doubleCsrfProtection(request, response, next);
    };
  }

  // CN: 执行 csrf common 的 create error handler 业务逻辑；EN: Runs the create error handler business logic for csrf common.
  createErrorHandler(): ErrorRequestHandler {
    return (
      error: unknown,
      _request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'CSRF_TOKEN_INVALID'
      ) {
        response.status(403).json({
          statusCode: 403,
          code: 'CSRF_TOKEN_INVALID',
          message: 'Invalid CSRF token',
        });
        return;
      }

      next(error);
    };
  }

  // CN: 执行 csrf common 的 ensure identifier cookie 业务逻辑；EN: Runs the ensure identifier cookie business logic for csrf common.
  private ensureIdentifierCookie(request: Request, response: Response): void {
    const identifierCookieName = resolveIdentifierCookieName(
      this.configService,
      this.nodeEnv,
    );

    if (readCookie(request, identifierCookieName)) {
      return;
    }

    const identifier = randomUUID();
    request.cookies = {
      ...((request.cookies as Record<string, unknown> | undefined) ?? {}),
      [identifierCookieName]: identifier,
    };
    response.cookie(identifierCookieName, identifier, {
      httpOnly: true,
      path: '/',
      sameSite: resolveCookieSameSite(this.configService),
      secure: resolveCookieSecure(this.configService, this.nodeEnv),
    });
  }
}
