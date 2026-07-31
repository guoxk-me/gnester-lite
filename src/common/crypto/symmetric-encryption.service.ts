import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ALGORITHM = 'aes-256-gcm';
const FORMAT_VERSION = 'v1';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const LOCAL_DEVELOPMENT_SECRET = 'gnester-lite-local-encryption-key';

@Injectable()
export class SymmetricEncryptionService {
  private readonly key!: Buffer;

  constructor(private readonly configService: ConfigService) {
    this.key = this.resolveKey();
  }

  encryptString(plaintext: string, authenticatedContext?: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);

    if (authenticatedContext) {
      cipher.setAAD(Buffer.from(authenticatedContext, 'utf8'));
    }

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      FORMAT_VERSION,
      ALGORITHM,
      this.encode(iv),
      this.encode(authTag),
      this.encode(encrypted),
    ].join(':');
  }

  decryptString(payload: string, authenticatedContext?: string): string {
    const parts = payload.split(':');

    if (
      parts.length !== 5 ||
      parts[0] !== FORMAT_VERSION ||
      parts[1] !== ALGORITHM
    ) {
      throw new Error('Encrypted payload format is invalid.');
    }

    const [, , encodedIv, encodedAuthTag, encodedEncrypted] = parts;

    try {
      const decipher = createDecipheriv(
        ALGORITHM,
        this.key,
        this.decode(encodedIv),
      );
      decipher.setAuthTag(this.decode(encodedAuthTag));

      if (authenticatedContext) {
        decipher.setAAD(Buffer.from(authenticatedContext, 'utf8'));
      }

      return Buffer.concat([
        decipher.update(this.decode(encodedEncrypted)),
        decipher.final(),
      ]).toString('utf8');
    } catch (error) {
      throw new Error('Encrypted payload authentication failed.', {
        cause: error,
      });
    }
  }

  private resolveKey(): Buffer {
    const configuredKey = this.configService.get<string>('ENCRYPTION_KEY');

    if (!configuredKey) {
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        throw new Error('ENCRYPTION_KEY is required in production.');
      }

      return createHash('sha256').update(LOCAL_DEVELOPMENT_SECRET).digest();
    }

    const key = this.decode(configuredKey);

    if (key.length !== KEY_LENGTH) {
      throw new Error('ENCRYPTION_KEY must decode to 32 bytes.');
    }

    return key;
  }

  private encode(value: Buffer): string {
    return value.toString('base64url');
  }

  private decode(value: string): Buffer {
    return Buffer.from(value, 'base64url');
  }
}
