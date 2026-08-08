import { DemoCorsService } from './demo-cors.service';

describe('DemoCorsService', () => {
  let service: DemoCorsService;

  beforeEach(() => {
    service = new DemoCorsService();
  });

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

  it('returns a public resource that needs an exposed response header', () => {
    expect(service.getPublicResource()).toEqual({
      id: 'public-catalog',
      visibility: 'public',
      corsRequirement: 'Expose X-Demo-Cors-Trace to browser JavaScript.',
    });
  });

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
