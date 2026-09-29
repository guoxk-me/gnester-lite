import { Module } from '@nestjs/common';

import { CryptoModule } from '../../crypto/crypto.module.js';
import { DemoCryptoController } from './demo-crypto.controller.js';
import { DemoCryptoService } from './demo-crypto.service.js';

@Module({
  imports: [CryptoModule],
  controllers: [DemoCryptoController],
  providers: [DemoCryptoService],
})
export class DemoCryptoModule {}
