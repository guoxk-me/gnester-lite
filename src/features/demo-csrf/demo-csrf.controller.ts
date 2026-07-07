// CN: 控制器，定义 demo-csrf 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-csrf.
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { CsrfService } from '../../common/csrf/csrf.service';
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
  // CN: 初始化 demo-csrf 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-csrf.
  constructor(
    private readonly csrfService: CsrfService,
    private readonly demoCsrfService: DemoCsrfService,
  ) {}

  // CN: 处理 demo-csrf 的 get overview HTTP 请求；EN: Handles the get overview HTTP request for demo-csrf.
  @Get()
  getOverview(): DemoCsrfOverviewDto {
    return this.demoCsrfService.getOverview();
  }

  // CN: 处理 demo-csrf 的 create token HTTP 请求；EN: Handles the create token HTTP request for demo-csrf.
  @Get('token')
  createToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): CsrfTokenDto {
    return {
      csrfToken: this.csrfService.createToken(request, response),
      headerName: this.csrfService.getHeaderName(),
    };
  }

  // CN: 处理 demo-csrf 的 preview transfer HTTP 请求；EN: Handles the preview transfer HTTP request for demo-csrf.
  @Post('transfer-preview')
  previewTransfer(
    @Body() dto: CreateDemoCsrfTransferDto,
  ): DemoCsrfTransferPreviewDto {
    return this.demoCsrfService.previewTransfer(dto);
  }
}
