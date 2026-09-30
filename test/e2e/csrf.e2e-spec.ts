import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  VERSION_NEUTRAL,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { ApplicationAuthService } from '../../src/modules/identity/application-auth.service.js';
import { SessionController } from '../../src/modules/identity/session.controller.js';
import { configureApplication } from '../../src/bootstrap/configure-application.js';
import { CsrfModule } from '../../src/infra/csrf/csrf.module.js';
import type { Request, Response } from 'express';
import { CsrfService } from '../../src/infra/csrf/csrf.service.js';

// AI modified: a test-owned boundary verifies reusable CSRF without retaining a teaching API.
@Controller({ path: 'csrf-fixture', version: VERSION_NEUTRAL })
class CsrfFixtureController {
  constructor(private readonly csrf: CsrfService) {}
  @Get('token') token(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): { csrfToken: string; headerName: string } {
    return {
      csrfToken: this.csrf.createToken(request, response),
      headerName: this.csrf.getHeaderName(),
    };
  }
  @Post('transfer') transfer(
    @Body() body: { recipient: string; amount: number },
  ): object {
    return { accepted: true, protectedBy: 'csrf-csrf', ...body };
  }
}

interface CsrfTokenResponseBody {
  csrfToken: string;
  headerName: string;
}

describe('CSRF protection (e2e)', () => {
  let app: NestExpressApplication | undefined;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          load: [
            () => ({
              NODE_ENV: 'test',
              CSRF_ENABLED: true,
              CSRF_SECRET: 'test-csrf-secret',
              COOKIE_SECRET: 'test-cookie-secret',
              app: {
                apiPrefix: 'api',
              },
              rateLimit: {
                trustProxy: false,
              },
            }),
          ],
        }),
        CsrfModule,
      ],
      controllers: [SessionController, CsrfFixtureController],
      providers: [
        {
          provide: ApplicationAuthService,
          useValue: {
            requireUser: () => {
              throw new UnauthorizedException();
            },
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    // AI modified: exercise the same order-sensitive bootstrap pipeline used by production.
    await configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('rejects unsafe browser mutations until the client sends the issued CSRF token', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/csrf-fixture/transfer')
      .send({ recipient: 'alice@example.com', amount: 25 })
      .expect(403)
      .expect({
        code: 403,
        message: 'Invalid CSRF token',
        data: null,
        errors: null,
      });

    const tokenResponse = await agent
      .get('/api/csrf-fixture/token')
      .expect(200);
    const tokenBody = tokenResponse.body as CsrfTokenResponseBody;

    expect(typeof tokenBody.csrfToken).toBe('string');
    expect(tokenBody.headerName).toBe('X-XSRF-TOKEN');

    await agent
      .post('/api/csrf-fixture/transfer')
      .set(tokenBody.headerName, tokenBody.csrfToken)
      .send({ recipient: 'alice@example.com', amount: 25 })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({
          accepted: true,
          protectedBy: 'csrf-csrf',
          recipient: 'alice@example.com',
          amount: 25,
        });
      });
  });

  it('issues a readable XSRF cookie during the existing session check', async () => {
    if (!app) throw new Error('Nest application was not initialized');
    const agent = request.agent(app.getHttpServer());
    // AI modified: application session checks seed the browser's XSRF cookie before login.
    const sessionResponse = await agent.get('/api/session').expect(401);
    const setCookie = sessionResponse.headers['set-cookie'];
    const cookies = Array.isArray(setCookie)
      ? (setCookie as string[])
      : typeof setCookie === 'string'
        ? [setCookie]
        : undefined;
    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^XSRF-TOKEN=/),
        expect.stringMatching(/^gnester\.csrf-id=/),
      ]),
    );
    const tokenCookie = cookies?.find((cookie) =>
      cookie.startsWith('XSRF-TOKEN='),
    );
    expect(tokenCookie).not.toContain('HttpOnly');
    const token = decodeURIComponent(
      tokenCookie?.split(';')[0]?.split('=')[1] ?? '',
    );

    await agent
      .post('/api/csrf-fixture/transfer')
      .set('X-XSRF-TOKEN', token)
      .send({ recipient: 'alice@example.com', amount: 25 })
      .expect(201);
  });
});
