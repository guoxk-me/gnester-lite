// CN: 服务，承载 crypto common 的业务逻辑；EN: Service holds business logic for crypto common.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';

const DEFAULT_TOKEN_BYTES = 32;
const TOKEN_DIGEST_PREFIX = 'sha256';

@Injectable()
export class SecureTokenService {
  // CN: 执行 crypto common 的 generate url safe token 业务逻辑；EN: Runs the generate url safe token business logic for crypto common.
  generateUrlSafeToken(bytes = DEFAULT_TOKEN_BYTES): string {
    return randomBytes(bytes).toString('base64url');
  }

  // CN: 执行 crypto common 的 hash token 业务逻辑；EN: Runs the hash token business logic for crypto common.
  hashToken(token: string): string {
    return `${TOKEN_DIGEST_PREFIX}:${this.digest(token).toString('base64url')}`;
  }

  // CN: 执行 crypto common 的 verify token 业务逻辑；EN: Runs the verify token business logic for crypto common.
  verifyToken(token: string, storedDigest: string): boolean {
    const [algorithm, encodedDigest] = storedDigest.split(':');

    if (algorithm !== TOKEN_DIGEST_PREFIX || !encodedDigest) {
      return false;
    }

    const actual = this.digest(token);
    const expected = Buffer.from(encodedDigest, 'base64url');

    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  // CN: 执行 crypto common 的 digest 业务逻辑；EN: Runs the digest business logic for crypto common.
  private digest(token: string): Buffer {
    return createHash(TOKEN_DIGEST_PREFIX).update(token, 'utf8').digest();
  }
}
