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
import { I18nService } from 'nestjs-i18n';

import {
  csrfIdentifierCookieName,
  csrfTokenCookieName,
} from 'config/cookie-name';
import { isBetterAuthRequestPath } from 'config/better-auth.config';
import { Environment } from 'config/config.types';
import { resolveSupportedLanguage } from '../../runtime/i18n/i18n.translate';

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

  constructor(
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {
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
      throw new ServiceUnavailableException('errors.CSRF_DISABLED');
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
      // AI modified: Better Auth owns origin and CSRF validation inside its exact raw-handler boundary.
      if (!this.isEnabled() || isBetterAuthRequestPath(request.path)) {
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
        const lang = resolveSupportedLanguage(
          typeof _request.headers?.['accept-language'] === 'string'
            ? _request.headers['accept-language']
            : undefined,
        );
        const translated = this.i18n.t('errors.CSRF_TOKEN_INVALID', {
          lang,
          defaultValue: 'Invalid CSRF token',
        });

        // AI modified: Express CSRF short-circuits Nest filters; emit the shared envelope here.
        response.status(403).json({
          code: 403,
          message:
            typeof translated === 'string' ? translated : 'Invalid CSRF token',
          data: null,
          errors: null,
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
