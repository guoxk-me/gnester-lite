import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DEMO_EVENTS } from './demo-events.constants';
import { DemoEventsController } from './demo-events.controller';
import { DemoEventsService } from './demo-events.service';
import { InvalidateDemoCacheDto } from './dto/invalidate-demo-cache.dto';
import { RegisterDemoUserDto } from './dto/register-demo-user.dto';

describe('DemoEventsController', () => {
  const service: jest.Mocked<
    Pick<
      DemoEventsService,
      'getOverview' | 'registerUser' | 'invalidateCache' | 'clear'
    >
  > = {
    getOverview: jest.fn(),
    registerUser: jest.fn(),
    invalidateCache: jest.fn(),
    clear: jest.fn(),
  };
  let controller: DemoEventsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoEventsController],
      providers: [
        {
          provide: DemoEventsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoEventsController>(DemoEventsController);
  });

  it('returns the event demo overview', () => {
    const overview = {
      events: [DEMO_EVENTS.UserRegistered],
      scenarios: ['write audit records'],
      records: [],
    };
    service.getOverview.mockReturnValueOnce(overview);

    expect(controller.getOverview()).toEqual(overview);
    expect(service.getOverview).toHaveBeenCalled();
  });

  it('delegates user registration events to the service', () => {
    const result = {
      scenario: 'domain event fans out to audit, notification, and trace',
      eventName: DEMO_EVENTS.UserRegistered,
      emitted: true,
      records: [],
    };
    service.registerUser.mockReturnValueOnce(result);

    expect(
      controller.registerUser({
        email: 'user@example.com',
        displayName: 'Demo User',
      }),
    ).toEqual(result);
    expect(service.registerUser).toHaveBeenCalledWith({
      email: 'user@example.com',
      displayName: 'Demo User',
    });
  });

  it('delegates cache invalidation events to the service', () => {
    const result = {
      scenario:
        'cache invalidation event fans out to cache work, audit, and trace',
      eventName: DEMO_EVENTS.CacheInvalidationRequested,
      emitted: true,
      records: [],
    };
    service.invalidateCache.mockReturnValueOnce(result);

    expect(
      controller.invalidateCache({
        cacheKey: 'demo:user:42',
        reason: 'user profile updated',
      }),
    ).toEqual(result);
    expect(service.invalidateCache).toHaveBeenCalledWith({
      cacheKey: 'demo:user:42',
      reason: 'user profile updated',
    });
  });

  it('delegates record clearing to the service', () => {
    controller.clearRecords();

    expect(service.clear).toHaveBeenCalled();
  });

  it('rejects a whitespace-only registration display name', async () => {
    const dto = plainToInstance(RegisterDemoUserDto, {
      email: 'user@example.com',
      displayName: '   ',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
    expect(service.registerUser).not.toHaveBeenCalled();
  });

  it.each([
    ['cache key', '   ', 'user profile updated'],
    ['reason', 'demo:user:42', '   '],
  ])('rejects a whitespace-only %s', async (_scenario, cacheKey, reason) => {
    const dto = plainToInstance(InvalidateDemoCacheDto, {
      cacheKey,
      reason,
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
    expect(service.invalidateCache).not.toHaveBeenCalled();
  });
});
