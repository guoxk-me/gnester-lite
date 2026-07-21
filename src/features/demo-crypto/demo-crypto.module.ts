import { Module } from '@nestjs/common';

import { CommonCryptoModule } from '../../common/crypto/crypto.module';
import { DemoCryptoController } from './demo-crypto.controller';
import { DemoCryptoService } from './demo-crypto.service';

// CN: 演示加密、令牌和签名；EN: Demonstrates encryption, tokens, and signatures.
@Module({
  imports: [CommonCryptoModule],
  controllers: [DemoCryptoController],
  providers: [DemoCryptoService],
})
export class DemoCryptoModule {}
