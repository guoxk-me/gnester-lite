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
  constructor(private readonly demoCryptoService: DemoCryptoService) {}

  @Get('scenarios')
  getScenarios(): DemoCryptoScenarioDto[] {
    return this.demoCryptoService.getScenarios();
  }

  @Post('encrypt-secret')
  encryptSecret(): DemoEncryptedSecretDto {
    return this.demoCryptoService.encryptSecret();
  }

  @Post('one-time-token')
  issueOneTimeToken(): DemoOneTimeTokenDto {
    return this.demoCryptoService.issueOneTimeToken();
  }

  @Post('webhook-signature')
  signWebhook(): DemoWebhookSignatureDto {
    return this.demoCryptoService.signWebhook();
  }
}
