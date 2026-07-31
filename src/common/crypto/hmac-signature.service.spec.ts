import { ConfigService } from '@nestjs/config';

import { HmacSignatureService } from './hmac-signature.service';

describe('HmacSignatureService', () => {
  let service: HmacSignatureService;

  beforeEach(() => {
    service = new HmacSignatureService(
      new ConfigService({
        HMAC_SECRET: 'test-webhook-secret',
        NODE_ENV: 'test',
      }),
    );
  });

  it('signs payloads and verifies matching signatures', () => {
    const signature = service.sign('{"event":"created"}');

    expect(signature).toMatch(/^sha256=[A-Za-z0-9_-]+$/);
    expect(service.verify('{"event":"created"}', signature)).toBe(true);
  });

  it('rejects tampered payloads and malformed signatures', () => {
    const signature = service.sign('{"event":"created"}');

    expect(service.verify('{"event":"deleted"}', signature)).toBe(false);
    expect(service.verify('{"event":"created"}', 'sha256=bad')).toBe(false);
  });
});
