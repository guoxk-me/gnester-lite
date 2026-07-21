// CN: 测试文件，验证 demo-crypto 的行为契约；EN: Test file verifies behavior contracts for demo-crypto.
import { Test, TestingModule } from '@nestjs/testing';

import { DemoCryptoController } from './demo-crypto.controller';
import { DemoCryptoService } from './demo-crypto.service';

// CN: 测试分组：DemoCryptoController；EN: Test group: DemoCryptoController.
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

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
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

  // CN: 测试用例：delegates scenario listing to the service；EN: Test case: delegates scenario listing to the service.
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

  // CN: 测试用例：delegates encryption examples to the service；EN: Test case: delegates encryption examples to the service.
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

  // CN: 测试用例：delegates one-time token examples to the service；EN: Test case: delegates one-time token examples to the service.
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

  // CN: 测试用例：delegates webhook signature examples to the service；EN: Test case: delegates webhook signature examples to the service.
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
