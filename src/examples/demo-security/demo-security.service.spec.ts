import { DemoSecurityService } from './demo-security.service';

describe('DemoSecurityService', () => {
  let service: DemoSecurityService;

  beforeEach(() => {
    service = new DemoSecurityService();
  });

  it('documents the security headers enabled by the template', () => {
    const overview = service.getSecurityOverview();

    expect(overview.middleware).toBe('helmet');
    expect(overview.registration).toBe(
      'global bootstrap middleware before compression, cookies, sessions, pipes, versioning, and routes',
    );
    expect(overview.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Content-Security-Policy',
          defaultValue:
            "default-src 'self'; object-src 'none'; base-uri 'self'",
        }),
        expect.objectContaining({
          name: 'X-Content-Type-Options',
          defaultValue: 'nosniff',
        }),
        expect.objectContaining({
          name: 'X-Frame-Options',
          defaultValue: 'SAMEORIGIN',
        }),
      ]),
    );
    expect(overview.scenarios).toEqual(
      expect.arrayContaining([
        'Public REST APIs that should not leak framework fingerprints',
        'Browser-consumed APIs that need baseline XSS and clickjacking headers',
        'Production HTTPS services that should emit HSTS',
      ]),
    );
  });
});
