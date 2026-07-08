// CN: 测试文件，验证 demo-cors 的行为契约；EN: Test file verifies behavior contracts for demo-cors.
import { DemoCorsService } from './demo-cors.service';

// CN: 测试分组：DemoCorsService；EN: Test group: DemoCorsService.
describe('DemoCorsService', () => {
  let service: DemoCorsService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    service = new DemoCorsService();
  });

  // CN: 测试用例：documents common CORS use cases for template consumers；EN: Test case: documents common CORS use cases for template consumers.
  it('documents common CORS use cases for template consumers', () => {
    expect(service.getScenarios()).toEqual([
      expect.objectContaining({
        name: 'public browser read',
        method: 'GET',
        route: '/demo-cors/public-resource',
      }),
      expect.objectContaining({
        name: 'credentialed browser request',
        method: 'GET',
        route: '/demo-cors/credentialed-resource',
      }),
      expect.objectContaining({
        name: 'preflighted JSON mutation',
        method: 'OPTIONS/POST',
        route: '/demo-cors/credentialed-resource',
      }),
      expect.objectContaining({
        name: 'exposed response headers',
        method: 'GET',
        route: '/demo-cors/public-resource',
      }),
    ]);
  });

  // CN: 测试用例：returns a public resource that needs an exposed response header；EN: Test case: returns a public resource that needs an exposed response header.
  it('returns a public resource that needs an exposed response header', () => {
    expect(service.getPublicResource()).toEqual({
      id: 'public-catalog',
      visibility: 'public',
      corsRequirement: 'Expose X-Demo-Cors-Trace to browser JavaScript.',
    });
  });

  // CN: 测试用例：returns credentialed resource state based on session presence；EN: Test case: returns credentialed resource state based on session presence.
  it('returns credentialed resource state based on session presence', () => {
    expect(service.getCredentialedResource(true)).toEqual({
      id: 'credentialed-profile',
      visibility: 'credentialed',
      hasSession: true,
      corsRequirement:
        'Use explicit origins and Access-Control-Allow-Credentials.',
    });
  });
});
