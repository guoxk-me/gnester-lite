// CN: 控制器，定义 demo-crypto 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-crypto.
import { Controller, Get, Post, VERSION_NEUTRAL } from '@nestjs/common';

import { DemoCryptoService } from './demo-crypto.service';
import { DemoCryptoScenarioDto } from './dto/demo-crypto-scenario.dto';
import { DemoEncryptedSecretDto } from './dto/demo-encrypted-secret.dto';
import { DemoOneTimeTokenDto } from './dto/demo-one-time-token.dto';
import { DemoWebhookSignatureDto } from './dto/demo-webhook-signature.dto';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-crypto',
})
export class DemoCryptoController {
  // CN: 初始化 demo-crypto 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-crypto.
  constructor(private readonly demoCryptoService: DemoCryptoService) {}

  // CN: 处理 demo-crypto 的 get scenarios HTTP 请求；EN: Handles the get scenarios HTTP request for demo-crypto.
  @Get('scenarios')
  getScenarios(): DemoCryptoScenarioDto[] {
    return this.demoCryptoService.getScenarios();
  }

  // CN: 处理 demo-crypto 的 encrypt secret HTTP 请求；EN: Handles the encrypt secret HTTP request for demo-crypto.
  @Post('encrypt-secret')
  encryptSecret(): DemoEncryptedSecretDto {
    return this.demoCryptoService.encryptSecret();
  }

  // CN: 处理 demo-crypto 的 issue one time token HTTP 请求；EN: Handles the issue one time token HTTP request for demo-crypto.
  @Post('one-time-token')
  issueOneTimeToken(): DemoOneTimeTokenDto {
    return this.demoCryptoService.issueOneTimeToken();
  }

  // CN: 处理 demo-crypto 的 sign webhook HTTP 请求；EN: Handles the sign webhook HTTP request for demo-crypto.
  @Post('webhook-signature')
  signWebhook(): DemoWebhookSignatureDto {
    return this.demoCryptoService.signWebhook();
  }
}
