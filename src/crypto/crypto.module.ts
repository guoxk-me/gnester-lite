import { Module } from '@nestjs/common';

import { HmacSignatureService } from './hmac-signature.service.js';
import { SecureTokenService } from './secure-token.service.js';
import { SymmetricEncryptionService } from './symmetric-encryption.service.js';

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
export class CryptoModule {}
