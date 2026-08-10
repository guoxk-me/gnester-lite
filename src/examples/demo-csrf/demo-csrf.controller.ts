import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { CsrfService } from '../../platform/security/csrf/csrf.service';
import { CreateDemoCsrfTransferDto } from './dto/create-demo-csrf-transfer.dto';
import { CsrfTokenDto } from './dto/csrf-token.dto';
import { DemoCsrfOverviewDto } from './dto/demo-csrf-overview.dto';
import { DemoCsrfTransferPreviewDto } from './dto/demo-csrf-transfer-preview.dto';
import { DemoCsrfService } from './demo-csrf.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-csrf',
})
export class DemoCsrfController {
  constructor(
    private readonly csrfService: CsrfService,
    private readonly demoCsrfService: DemoCsrfService,
  ) {}

  @Get()
  getOverview(): DemoCsrfOverviewDto {
    return this.demoCsrfService.getOverview();
  }

  @Get('token')
  // AI modified: token issuance also returns private cache and cookie headers.
  @ApiResponse({
    status: 503,
    description: 'CSRF protection is disabled',
  })
  @ApiResponse({
    status: 200,
    type: CsrfTokenDto,
    headers: {
      'Cache-Control': {
        description: 'Prevents caching of request-bound CSRF material',
        schema: { type: 'string', example: 'no-store' },
      },
      'Set-Cookie': {
        description:
          'Issues separate httpOnly CSRF identifier and token cookie header fields',
        schema: {
          type: 'string',
          example: 'gnester.csrf-token=value; Path=/; HttpOnly; SameSite=Lax',
        },
      },
    },
  })
  createToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): CsrfTokenDto {
    // AI modified: CSRF tokens are request-bound security material and must never enter shared caches.
    response.setHeader('Cache-Control', 'no-store');

    return {
      csrfToken: this.csrfService.createToken(request, response),
      headerName: this.csrfService.getHeaderName(),
    };
  }

  @Post('transfer-preview')
  @ApiResponse({
    status: 400,
    description: 'Transfer preview input failed validation',
  })
  @ApiResponse({ status: 201, type: DemoCsrfTransferPreviewDto })
  previewTransfer(
    @Body() dto: CreateDemoCsrfTransferDto,
  ): DemoCsrfTransferPreviewDto {
    return this.demoCsrfService.previewTransfer(dto);
  }
}
