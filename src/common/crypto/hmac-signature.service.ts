import { createHmac, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const HMAC_ALGORITHM = 'sha256';
const LOCAL_DEVELOPMENT_SECRET = 'gnester-lite-local-hmac-secret';

@Injectable()
export class HmacSignatureService {
  private readonly secret!: string;

  constructor(private readonly configService: ConfigService) {
    this.secret = this.resolveSecret();
  }

  sign(payload: string): string {
    return `${HMAC_ALGORITHM}=${this.digest(payload).toString('base64url')}`;
  }

  verify(payload: string, signature: string): boolean {
    const expectedSignature = this.sign(payload);
    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  private digest(payload: string): Buffer {
    return createHmac(HMAC_ALGORITHM, this.secret).update(payload).digest();
  }

  private resolveSecret(): string {
    const configuredSecret = this.configService.get<string>('HMAC_SECRET');

    if (!configuredSecret) {
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        throw new Error('HMAC_SECRET is required in production.');
      }

      return LOCAL_DEVELOPMENT_SECRET;
    }

    return configuredSecret;
  }
}
