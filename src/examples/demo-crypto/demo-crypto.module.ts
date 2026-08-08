import { Module } from '@nestjs/common';

import { CommonCryptoModule } from '../../platform/security/crypto/crypto.module';
import { DemoCryptoController } from './demo-crypto.controller';
import { DemoCryptoService } from './demo-crypto.service';

@Module({
  imports: [CommonCryptoModule],
  controllers: [DemoCryptoController],
  providers: [DemoCryptoService],
})
export class DemoCryptoModule {}
