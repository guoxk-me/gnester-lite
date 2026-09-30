import { UnauthorizedException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { ApplicationAuthService } from '../../src/modules/identity/application-auth.service.js';
import { PasswordHashService } from '../../src/infra/auth/password-hash.service.js';
import { configureApplication } from '../../src/bootstrap/configure-application.js';
import { CsrfModule } from '../../src/infra/csrf/csrf.module.js';
import {
  AdminInvitationsController,
  AdminUsersController,
  PublicInvitationsController,
  SecurityTokenController,
} from '../../src/modules/identity/user-management.controller.js';
import { UserManagementService } from '../../src/modules/identity/user-management.service.js';

interface CsrfTokenBody {
  csrfToken: string;
  headerName: string;
}

// AI modified: exercise admin authorization and invitation CSRF on the real HTTP bootstrap path.
describe('user management (e2e)', () => {
  let app: NestExpressApplication | undefined;
  let management: UserManagementService;
  const databaseQuery =
    vi.fn<(...args: [string, unknown[]?]) => Promise<unknown>>();
  const requireUser = vi.fn(
    (incomingRequest: { headers: { cookie?: string } }) => {
      if (!incomingRequest.headers.cookie) throw new UnauthorizedException();
      return Promise.resolve({ id: 'admin-1' });
    },
  );

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
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
              app: { apiPrefix: 'api' },
              rateLimit: { trustProxy: false },
            }),
          ],
        }),
        CsrfModule,
      ],
      controllers: [
        AdminUsersController,
        AdminInvitationsController,
        PublicInvitationsController,
        SecurityTokenController,
      ],
      providers: [
        UserManagementService,
        { provide: DataSource, useValue: { query: databaseQuery } },
        {
          provide: ApplicationAuthService,
          useValue: { requireUser },
        },
        { provide: PasswordHashService, useValue: { hash: vi.fn() } },
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    management = app.get(UserManagementService);
    await configureApplication(app);
    await app.listen(0, '127.0.0.1');
  });

  beforeEach(() => {
    databaseQuery.mockReset();
    requireUser.mockClear();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('requires a current administrator role for the management API', async () => {
    if (!app) throw new Error('Nest application was not initialized');

    await request(app.getHttpServer()).get('/api/admin/users').expect(401);

    databaseQuery.mockResolvedValueOnce([{ role: 'user', banned: false }]);
    await request(app.getHttpServer())
      .get('/api/admin/users')
      .set('Cookie', 'session=abc')
      .expect(403);

    databaseQuery
      .mockResolvedValueOnce([{ role: 'admin', banned: false }])
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([]);
    await request(app.getHttpServer())
      .get('/api/admin/users')
      .set('Cookie', 'session=abc')
      .expect(200, { rows: [], total: 0 });
  });

  it('requires an issued CSRF token before accepting an invitation', async () => {
    if (!app) throw new Error('Nest application was not initialized');

    const agent = request.agent(app.getHttpServer());
    const invitationBody = {
      token: 'x'.repeat(43),
      name: 'Invitee',
      password: 'password123',
    };
    const acceptInvitation = vi
      .spyOn(management, 'acceptInvitation')
      .mockResolvedValue(undefined);

    await agent
      .post('/api/invitations/accept')
      .send(invitationBody)
      .expect(403);
    expect(acceptInvitation).not.toHaveBeenCalled();

    const tokenResponse = await agent
      .get('/api/security/csrf-token')
      .expect(200);
    const { csrfToken, headerName } = tokenResponse.body as CsrfTokenBody;

    await agent
      .post('/api/invitations/accept')
      .set(headerName, csrfToken)
      .send({ ...invitationBody, token: 'short' })
      .expect(422);
    await agent
      .post('/api/invitations/accept')
      .set(headerName, csrfToken)
      .send(invitationBody)
      .expect(200, { success: true });
    expect(acceptInvitation).toHaveBeenCalledWith(
      invitationBody.token,
      invitationBody.name,
      invitationBody.password,
    );
  });
});
