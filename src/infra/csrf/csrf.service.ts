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

import type { CsrfSameSite } from './cookie.types.js';
import {
  csrfIdentifierCookieName,
  DEFAULT_CSRF_TOKEN_COOKIE_NAME,
} from '../../config/cookie-name.js';
import { Environment } from '../../config/config-enums.js';
import { resolveSupportedLanguage } from '../i18n/i18n.translate.js';

export const CSRF_LOCAL_DEVELOPMENT_SECRET =
  'gnester-lite-local-csrf-secret-change-me';

function readCookie(request: Request, name: string): string | undefined {
  const signedCookies = request.signedCookies as
    Record<string, unknown> | undefined;
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = signedCookies?.[name] ?? cookies?.[name];

  return typeof value === 'string' ? value : undefined;
}

function resolveNodeEnv(
  configService: Pick<ConfigService, 'get'>,
): Environment {
  return configService.get<Environment>('NODE_ENV', Environment.Development);
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
  // AI modified: browser clients use Axios's one fixed XSRF cookie name.
  const tokenCookieName = DEFAULT_CSRF_TOKEN_COOKIE_NAME;
  const identifierCookieName = resolveIdentifierCookieName(
    configService,
    nodeEnv,
  );
  const headerName = 'x-xsrf-token';
  const secret =
    configService.get<string>('CSRF_SECRET') || CSRF_LOCAL_DEVELOPMENT_SECRET;
  const isCookieSecure = resolveCookieSecure(configService, nodeEnv);
  const sameSite = resolveCookieSameSite(configService);

  return {
    getSecret: () => secret,
    // AI modified: the independent identifier cookie survives removal of Demo express-session middleware.
    getSessionIdentifier: (request: Request) =>
      readCookie(request, identifierCookieName) || '',
    cookieName: tokenCookieName,
    cookieOptions: {
      // AI modified: Axios reads this signed double-submit token; the identifier remains HttpOnly.
      httpOnly: false,
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
    return 'X-XSRF-TOKEN';
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
      // AI modified: every unsafe application route now shares the same CSRF boundary.
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
      request: Request,
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
          request.headers?.['accept-language'],
        );
        const translated = this.i18n.t('errors.CSRF_TOKEN_INVALID', {
          lang,
          defaultValue: 'Invalid CSRF token',
        });

        // AI modified: Express CSRF short-circuits Nest filters; emit the shared envelope here.
        response.vary('Accept-Language');
        response.setHeader('Content-Language', lang);
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
      ...(request.cookies as Record<string, unknown> | undefined),
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
