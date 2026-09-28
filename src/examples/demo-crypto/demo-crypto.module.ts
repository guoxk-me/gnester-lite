import { Module } from '@nestjs/common';

import { CryptoModule } from '../../crypto/crypto.module';
import { DemoCryptoController } from './demo-crypto.controller';
import { DemoCryptoService } from './demo-crypto.service';

@Module({
  imports: [CryptoModule],
  controllers: [DemoCryptoController],
  providers: [DemoCryptoService],
})
export class DemoCryptoModule {}
