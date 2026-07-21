import { Module } from '@nestjs/common';

import { HmacSignatureService } from './hmac-signature.service';
import { SecureTokenService } from './secure-token.service';
import { SymmetricEncryptionService } from './symmetric-encryption.service';

// CN: 加密模块集中签名、令牌和加解密能力；EN: Crypto module centralizes signing, tokens, and encryption.
@Module({
  providers: [
    HmacSignatureService,
    SecureTokenService,
    SymmetricEncryptionService,
  ],
  exports: [
    HmacSignatureService,
    SecureTokenService,
    SymmetricEncryptionService,
  ],
})
export class CommonCryptoModule {}
