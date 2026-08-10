import { Module } from '@nestjs/common';

import { HmacSignatureService } from './hmac-signature.service';
import { SecureTokenService } from './secure-token.service';
import { SymmetricEncryptionService } from './symmetric-encryption.service';

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
