import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';

const DEFAULT_TOKEN_BYTES = 32;
const TOKEN_DIGEST_BYTES = 32;
const TOKEN_DIGEST_PREFIX = 'sha256';

@Injectable()
export class SecureTokenService {
  generateUrlSafeToken(bytes = DEFAULT_TOKEN_BYTES): string {
    return randomBytes(bytes).toString('base64url');
  }

  hashToken(token: string): string {
    return `${TOKEN_DIGEST_PREFIX}:${this.digest(token).toString('base64url')}`;
  }

  verifyToken(token: string, storedDigest: string): boolean {
    const digestParts = storedDigest.split(':');
    const [algorithm, encodedDigest] = digestParts;

    if (
      digestParts.length !== 2 ||
      algorithm !== TOKEN_DIGEST_PREFIX ||
      !encodedDigest
    ) {
      return false;
    }

    const actual = this.digest(token);
    const expected = Buffer.from(encodedDigest, 'base64url');

    // AI modified: reject permissive or non-canonical base64url before comparing token material.
    return (
      expected.length === TOKEN_DIGEST_BYTES &&
      expected.toString('base64url') === encodedDigest &&
      timingSafeEqual(actual, expected)
    );
  }

  private digest(token: string): Buffer {
    return createHash(TOKEN_DIGEST_PREFIX).update(token, 'utf8').digest();
  }
}
