import {
  Controller,
  Get,
  Header,
  Res,
  Session,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';

import {
  DemoCorsResourceDto,
  DemoCredentialedCorsResourceDto,
} from './dto/demo-cors-resource.dto';
import { DemoCorsScenarioDto } from './dto/demo-cors-scenario.dto';
import { DemoCorsService } from './demo-cors.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-cors',
})
export class DemoCorsController {
  constructor(private readonly demoCorsService: DemoCorsService) {}

  @Get('scenarios')
  getScenarios(): DemoCorsScenarioDto[] {
    return this.demoCorsService.getScenarios();
  }

  @Get('public-resource')
  // AI modified: expose the response header that browser clients are expected to read.
  @ApiResponse({
    status: 200,
    type: DemoCorsResourceDto,
    headers: {
      'X-Demo-Cors-Trace': {
        description: 'Illustrative response header exposed by the CORS policy',
        schema: {
          type: 'string',
          example: 'demo-cors-public-resource',
        },
      },
    },
  })
  getPublicResource(
    @Res({ passthrough: true }) response: Response,
  ): DemoCorsResourceDto {
    response.setHeader('X-Demo-Cors-Trace', 'demo-cors-public-resource');

    return this.demoCorsService.getPublicResource();
  }

  @Get('credentialed-resource')
  // AI modified: the response includes session-derived state and must stay private.
  @Header('Cache-Control', 'private, no-store')
  @ApiResponse({
    status: 200,
    type: DemoCredentialedCorsResourceDto,
    headers: {
      'Cache-Control': {
        description: 'Prevents caching of credential-derived browser state',
        schema: { type: 'string', example: 'private, no-store' },
      },
    },
  })
  getCredentialedResource(
    @Session() session: Record<string, unknown> | undefined,
  ): DemoCredentialedCorsResourceDto {
    return this.demoCorsService.getCredentialedResource(Boolean(session));
  }
}
