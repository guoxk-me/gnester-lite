// CN: 测试文件，验证 crypto common 的行为契约；EN: Test file verifies behavior contracts for crypto common.
import { ConfigService } from '@nestjs/config';

import { HmacSignatureService } from './hmac-signature.service';

// CN: 测试分组：HmacSignatureService；EN: Test group: HmacSignatureService.
describe('HmacSignatureService', () => {
  let service: HmacSignatureService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    service = new HmacSignatureService(
      new ConfigService({
        HMAC_SECRET: 'test-webhook-secret',
        NODE_ENV: 'test',
      }),
    );
  });

  // CN: 测试用例：signs payloads and verifies matching signatures；EN: Test case: signs payloads and verifies matching signatures.
  it('signs payloads and verifies matching signatures', () => {
    const signature = service.sign('{"event":"created"}');

    expect(signature).toMatch(/^sha256=[A-Za-z0-9_-]+$/);
    expect(service.verify('{"event":"created"}', signature)).toBe(true);
  });

  // CN: 测试用例：rejects tampered payloads and malformed signatures；EN: Test case: rejects tampered payloads and malformed signatures.
  it('rejects tampered payloads and malformed signatures', () => {
    const signature = service.sign('{"event":"created"}');

    expect(service.verify('{"event":"deleted"}', signature)).toBe(false);
    expect(service.verify('{"event":"created"}', 'sha256=bad')).toBe(false);
  });
});
