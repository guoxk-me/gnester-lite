import { DemoCryptoService } from './demo-crypto.service';

describe('DemoCryptoService', () => {
  const encryptionService = {
    encryptString: jest.fn(),
    decryptString: jest.fn(),
  };
  const tokenService = {
    generateUrlSafeToken: jest.fn(),
    hashToken: jest.fn(),
    verifyToken: jest.fn(),
  };
  const hmacSignatureService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  let service: DemoCryptoService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new DemoCryptoService(
      encryptionService as never,
      tokenService as never,
      hmacSignatureService as never,
    );
  });

  it('demonstrates reversible encryption without returning the original secret field', () => {
    encryptionService.encryptString.mockReturnValueOnce(
      'v1:aes-256-gcm:iv:tag:cipher',
    );
    encryptionService.decryptString.mockReturnValueOnce('provider-token');

    expect(service.encryptSecret()).toEqual({
      scenario: 'Encrypt a recoverable secret',
      encrypted: 'v1:aes-256-gcm:iv:tag:cipher',
      decryptedPreview: 'provider...',
      authenticatedContext: 'demo-crypto:tenant:acme',
    });
  });

  it('demonstrates one-time token storage by returning a digest instead of the raw token', () => {
    tokenService.generateUrlSafeToken.mockReturnValueOnce('raw-token');
    tokenService.hashToken.mockReturnValueOnce('sha256:digest');
    tokenService.verifyToken.mockReturnValueOnce(true);

    expect(service.issueOneTimeToken()).toEqual({
      scenario: 'Issue a one-time token',
      tokenPreview: 'raw-toke...',
      storedDigest: 'sha256:digest',
      verifies: true,
    });
  });

  it('demonstrates HMAC webhook signing and tamper rejection', () => {
    hmacSignatureService.sign.mockReturnValueOnce('sha256=signature');
    hmacSignatureService.verify
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    expect(service.signWebhook()).toEqual({
      scenario: 'Sign a webhook payload',
      payload: '{"event":"demo.created","id":"demo-1"}',
      signature: 'sha256=signature',
      verifiesOriginalPayload: true,
      rejectsTamperedPayload: true,
    });
  });
});
