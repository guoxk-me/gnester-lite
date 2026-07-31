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

import {
  csrfIdentifierCookieName,
  csrfTokenCookieName,
} from 'config/cookie-name';
import { Environment } from 'config/config.types';

export const CSRF_LOCAL_DEVELOPMENT_SECRET =
  'gnester-lite-local-csrf-secret-change-me';

type CsrfSameSite = 'lax' | 'strict' | 'none';

function readCookie(request: Request, name: string): string | undefined {
  const signedCookies = request.signedCookies as
    | Record<string, unknown>
    | undefined;
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = signedCookies?.[name] ?? cookies?.[name];

  return typeof value === 'string' ? value : undefined;
}

function resolveNodeEnv(
  configService: Pick<ConfigService, 'get'>,
): Environment {
  return configService.get<Environment>('NODE_ENV', Environment.Development);
}

function resolveTokenCookieName(
  configService: Pick<ConfigService, 'get'>,
  nodeEnv: Environment,
): string {
  return csrfTokenCookieName(
    configService.get<string>('CSRF_COOKIE_NAME'),
    nodeEnv,
  );
}

function resolveIdentifierCookieName(
  configService: Pick<ConfigService, 'get'>,
  nodeEnv: Environment,
): string {
  return csrfIdentifierCookieName(
    configService.get<string>('CSRF_IDENTIFIER_COOKIE_NAME'),
    nodeEnv,
  );
}

function resolveCookieSecure(
  configService: Pick<ConfigService, 'get'>,
  nodeEnv: Environment,
): boolean {
  return configService.get<boolean>(
    'CSRF_COOKIE_SECURE',
    nodeEnv === Environment.Production,
  );
}

function resolveCookieSameSite(
  configService: Pick<ConfigService, 'get'>,
): CsrfSameSite {
  return configService.get<CsrfSameSite>('CSRF_COOKIE_SAME_SITE', 'lax');
}

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
  const isCookieSecure = resolveCookieSecure(configService, nodeEnv);
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
      secure: isCookieSecure,
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
  private readonly nodeEnv!: Environment;
  private readonly utilities!: ReturnType<typeof doubleCsrf>;

  constructor(private readonly configService: ConfigService) {
    this.nodeEnv = resolveNodeEnv(configService);
    this.utilities = doubleCsrf(createCsrfOptions(configService, this.nodeEnv));
  }

  isEnabled(): boolean {
    return this.configService.get<boolean>('CSRF_ENABLED', true);
  }

  getHeaderName(): string {
    return this.configService.get<string>('CSRF_HEADER_NAME', 'x-csrf-token');
  }

  createToken(request: Request, response: Response): string {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException('CSRF protection is disabled.');
    }

    this.ensureIdentifierCookie(request, response);

    return this.utilities.generateCsrfToken(request, response);
  }

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
