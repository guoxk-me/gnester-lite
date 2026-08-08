import { Test, TestingModule } from '@nestjs/testing';

import { DemoCryptoController } from './demo-crypto.controller';
import { DemoCryptoService } from './demo-crypto.service';

describe('DemoCryptoController', () => {
  const service: jest.Mocked<
    Pick<
      DemoCryptoService,
      'getScenarios' | 'encryptSecret' | 'issueOneTimeToken' | 'signWebhook'
    >
  > = {
    getScenarios: jest.fn(),
    encryptSecret: jest.fn(),
    issueOneTimeToken: jest.fn(),
    signWebhook: jest.fn(),
  };
  let controller: DemoCryptoController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoCryptoController],
      providers: [
        {
          provide: DemoCryptoService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoCryptoController>(DemoCryptoController);
  });

  it('delegates scenario listing to the service', () => {
    const scenarios = [
      {
        name: 'Authenticated encryption',
        method: 'POST',
        route: '/demo-crypto/encrypt-secret',
        useCase: 'Encrypt a recoverable token before database storage.',
        nestPattern:
          'Inject SymmetricEncryptionService from CommonCryptoModule.',
      },
    ];
    service.getScenarios.mockReturnValueOnce(scenarios);

    expect(controller.getScenarios()).toEqual(scenarios);
    expect(service.getScenarios).toHaveBeenCalled();
  });

  it('delegates encryption examples to the service', () => {
    service.encryptSecret.mockReturnValueOnce({
      scenario: 'Encrypt a recoverable secret',
      encrypted: 'v1:aes-256-gcm:iv:tag:cipher',
      decryptedPreview: 'provider-...',
      authenticatedContext: 'demo-crypto:tenant:acme',
    });

    expect(controller.encryptSecret()).toEqual({
      scenario: 'Encrypt a recoverable secret',
      encrypted: 'v1:aes-256-gcm:iv:tag:cipher',
      decryptedPreview: 'provider-...',
      authenticatedContext: 'demo-crypto:tenant:acme',
    });
  });

  it('delegates one-time token examples to the service', () => {
    service.issueOneTimeToken.mockReturnValueOnce({
      scenario: 'Issue a one-time token',
      tokenPreview: 'token...',
      storedDigest: 'sha256:digest',
      verifies: true,
    });

    expect(controller.issueOneTimeToken()).toEqual({
      scenario: 'Issue a one-time token',
      tokenPreview: 'token...',
      storedDigest: 'sha256:digest',
      verifies: true,
    });
  });

  it('delegates webhook signature examples to the service', () => {
    service.signWebhook.mockReturnValueOnce({
      scenario: 'Sign a webhook payload',
      payload: '{"event":"demo.created","id":"demo-1"}',
      signature: 'sha256=signature',
      verifiesOriginalPayload: true,
      rejectsTamperedPayload: true,
    });

    expect(controller.signWebhook()).toEqual({
      scenario: 'Sign a webhook payload',
      payload: '{"event":"demo.created","id":"demo-1"}',
      signature: 'sha256=signature',
      verifiesOriginalPayload: true,
      rejectsTamperedPayload: true,
    });
  });
});
