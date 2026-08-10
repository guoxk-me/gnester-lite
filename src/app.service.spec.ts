import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';

import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: I18nService,
          useValue: {
            t: jest.fn(() => 'Hello World!'),
          },
        },
      ],
    }).compile();

    service = module.get(AppService);
  });

  it('returns a greeting', () => {
    expect(service.getHello()).toBe('Hello World!');
  });
});
