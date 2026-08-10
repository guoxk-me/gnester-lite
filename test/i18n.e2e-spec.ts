import {
  Body,
  type CanActivate,
  Controller,
  Get,
  HttpStatus,
  Injectable,
  type INestApplication,
  type MessageEvent,
  Post,
  ServiceUnavailableException,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { IsIn } from 'class-validator';
import { of, type Observable } from 'rxjs';
import request from 'supertest';
import type { App } from 'supertest/types';

import { createValidationPipe } from '../src/bootstrap/http/validation.pipe';
import type { ApiEnvelope } from '../src/contracts/api-envelope';
import { CommonI18nModule } from '../src/platform/runtime/i18n/i18n.module';
import { SkipApiEnvelope } from '../src/platform/runtime/i18n/skip-api-envelope.decorator';

const probeFailure = {
  status: 'error',
  info: {},
  error: {
    application: {
      status: 'down',
      message: 'Application is draining',
    },
  },
  details: {
    application: {
      status: 'down',
      message: 'Application is draining',
    },
  },
};

class I18nValidationFixtureDto {
  @IsIn(['alpha', 'beta'])
  readonly choice!: string;
}

@Injectable()
class NativeProbeFailureGuard implements CanActivate {
  canActivate(): never {
    throw new ServiceUnavailableException(probeFailure);
  }
}

@Controller('i18n-fixture')
class I18nFixtureController {
  @SkipApiEnvelope()
  @Get('probe')
  probe(): never {
    throw new ServiceUnavailableException(probeFailure);
  }

  @SkipApiEnvelope()
  @UseGuards(NativeProbeFailureGuard)
  @Get('guarded-probe')
  guardedProbe(): void {}

  @Post('validation')
  validate(
    @Body() validationFixture: I18nValidationFixtureDto,
  ): I18nValidationFixtureDto {
    return validationFixture;
  }

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return of({
      type: 'heartbeat',
      data: { status: 'ok' },
    });
  }
}

describe('localized HTTP contract (e2e)', () => {
  let app: INestApplication<App> | undefined;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CommonI18nModule],
      controllers: [I18nFixtureController],
      providers: [NativeProbeFailureGuard],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(createValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('preserves the native failure body for envelope opt-outs', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    // AI modified: exercise the interceptor-to-filter opt-out handoff used by Terminus probes.
    await request(app.getHttpServer())
      .get('/i18n-fixture/probe')
      .expect(HttpStatus.SERVICE_UNAVAILABLE)
      .expect(probeFailure);
  });

  it('preserves opt-out failures raised before the interceptor', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    // AI modified: a global boundary guard must mark the route before its controller guard fails.
    await request(app.getHttpServer())
      .get('/i18n-fixture/guarded-probe')
      .expect(HttpStatus.SERVICE_UNAVAILABLE)
      .expect(probeFailure);
  });

  it('localizes validation constraints with their arguments', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    await request(app.getHttpServer())
      .post('/i18n-fixture/validation')
      .set('Accept-Language', 'zh')
      .send({ choice: 'gamma' })
      .expect(HttpStatus.BAD_REQUEST)
      .expect('Content-Language', 'zh')
      .expect('Vary', /Accept-Language/)
      .expect(({ body }) => {
        const envelope = body as unknown as ApiEnvelope<null>;

        expect(envelope).toMatchObject({
          code: HttpStatus.BAD_REQUEST,
          message: '校验失败',
          data: null,
        });
        expect(envelope.errors).toHaveLength(1);
        expect(envelope.errors?.[0]?.field).toBe('choice');
        expect(envelope.errors?.[0]?.reason).toMatch(/choice.*alpha.*beta/);
        expect(envelope.errors?.[0]?.reason).not.toContain('must be');
      });
  });

  it('keeps SSE events outside the JSON envelope', async () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    await request(app.getHttpServer())
      .get('/i18n-fixture/stream')
      .set('Accept', 'text/event-stream')
      .expect(HttpStatus.OK)
      .expect('Content-Type', /text\/event-stream/)
      .expect(({ text }) => {
        expect(text).toContain('event: heartbeat');
        expect(text).toContain('data: {"status":"ok"}');
        expect(text).not.toContain('"code":200');
      });
  });
});
