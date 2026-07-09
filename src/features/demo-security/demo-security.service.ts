// CN: 服务，承载 demo-security 的业务逻辑；EN: Service holds business logic for demo-security.
import { Injectable } from '@nestjs/common';
import { DemoSecurityOverviewDto } from './dto/demo-security-overview.dto';

@Injectable()
export class DemoSecurityService {
  // CN: 执行 demo-security 的 get security overview 业务逻辑；EN: Runs the get security overview business logic for demo-security.
  getSecurityOverview(): DemoSecurityOverviewDto {
    return {
      middleware: 'helmet',
      registration:
        'global bootstrap middleware before compression, cookies, sessions, pipes, versioning, and routes',
      headers: [
        {
          name: 'Content-Security-Policy',
          defaultValue:
            "default-src 'self'; object-src 'none'; base-uri 'self'",
          purpose:
            'Restricts browser-loadable resources to reduce XSS and content injection risk.',
        },
        {
          name: 'Cross-Origin-Opener-Policy',
          defaultValue: 'same-origin',
          purpose:
            'Improves browser process isolation for pages served by the API host.',
        },
        {
          name: 'Cross-Origin-Resource-Policy',
          defaultValue: 'same-origin',
          purpose:
            'Prevents other origins from loading API-hosted resources in common browser contexts.',
        },
        {
          name: 'Referrer-Policy',
          defaultValue: 'no-referrer',
          purpose:
            'Avoids leaking request paths through browser referrer data.',
        },
        {
          name: 'Strict-Transport-Security',
          defaultValue: 'max-age=31536000; includeSubDomains',
          purpose:
            'Tells browsers to prefer HTTPS in production after the first secure request.',
        },
        {
          name: 'X-Content-Type-Options',
          defaultValue: 'nosniff',
          purpose: 'Prevents MIME type sniffing for API responses.',
        },
        {
          name: 'X-Frame-Options',
          defaultValue: 'SAMEORIGIN',
          purpose: 'Adds legacy clickjacking protection.',
        },
      ],
      scenarios: [
        'Public REST APIs that should not leak framework fingerprints',
        'Browser-consumed APIs that need baseline XSS and clickjacking headers',
        'Production HTTPS services that should emit HSTS',
      ],
      notes: [
        'Helmet is configured in bootstrap code because middleware order determines route coverage.',
        'Development and test disable HSTS and CSP upgrade-insecure-requests to keep localhost HTTP usable.',
        'Cross-Origin-Embedder-Policy is disabled by default for template compatibility with Swagger, GraphQL sandboxes, and third-party assets.',
      ],
    };
  }
}
