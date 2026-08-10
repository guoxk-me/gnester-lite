import { Injectable } from '@nestjs/common';

import {
  DemoCorsResourceDto,
  DemoCredentialedCorsResourceDto,
} from './dto/demo-cors-resource.dto';
import { DemoCorsScenarioDto } from './dto/demo-cors-scenario.dto';

@Injectable()
export class DemoCorsService {
  getScenarios(): DemoCorsScenarioDto[] {
    return [
      {
        name: 'public browser read',
        method: 'GET',
        route: '/demo-cors/public-resource',
        useCase:
          'Allow a browser frontend on another origin to read public JSON.',
        nestPattern:
          'Enable global CORS once in bootstrap and keep the controller regular.',
      },
      {
        name: 'credentialed browser request',
        method: 'GET',
        route: '/demo-cors/credentialed-resource',
        useCase:
          'Send cookies or browser-managed credentials from a trusted frontend.',
        nestPattern:
          'Use explicit origins with credentials enabled; never combine credentials with wildcard origins.',
      },
      {
        name: 'preflighted JSON mutation',
        method: 'OPTIONS/POST',
        route: '/demo-cors/credentialed-resource',
        useCase:
          'Let browsers preflight JSON mutations with custom headers before the real request.',
        nestPattern:
          'Configure methods, allowedHeaders, maxAge, and optionsSuccessStatus in the global CORS options.',
      },
      {
        name: 'exposed response headers',
        method: 'GET',
        route: '/demo-cors/public-resource',
        useCase:
          'Allow browser JavaScript to read selected response headers such as request ids or download names.',
        nestPattern:
          'Set response headers in controllers and list readable names in CORS_EXPOSED_HEADERS.',
      },
    ];
  }

  getPublicResource(): DemoCorsResourceDto {
    return {
      id: 'public-catalog',
      visibility: 'public',
      corsRequirement: 'Expose X-Demo-Cors-Trace to browser JavaScript.',
    };
  }

  getCredentialedResource(
    hasSession: boolean,
  ): DemoCredentialedCorsResourceDto {
    return {
      id: 'credentialed-profile',
      visibility: 'credentialed',
      hasSession,
      corsRequirement:
        'Use explicit origins and Access-Control-Allow-Credentials.',
    };
  }
}
