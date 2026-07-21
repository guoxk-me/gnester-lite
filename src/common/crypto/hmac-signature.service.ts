// CN: 服务，承载 crypto common 的业务逻辑；EN: Service holds business logic for crypto common.
import { createHmac, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const HMAC_ALGORITHM = 'sha256';
const LOCAL_DEVELOPMENT_SECRET = 'gnester-lite-local-hmac-secret';

@Injectable()
export class HmacSignatureService {
  private readonly secret: string;

  // CN: 初始化 crypto common 的依赖和运行状态；EN: Initializes dependencies and runtime state for crypto common.
  constructor(private readonly configService: ConfigService) {
    this.secret = this.resolveSecret();
  }

  // CN: 执行 crypto common 的 sign 业务逻辑；EN: Runs the sign business logic for crypto common.
  sign(payload: string): string {
    return `${HMAC_ALGORITHM}=${this.digest(payload).toString('base64url')}`;
  }

  // CN: 执行 crypto common 的 verify 业务逻辑；EN: Runs the verify business logic for crypto common.
  verify(payload: string, signature: string): boolean {
    const expectedSignature = this.sign(payload);
    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  // CN: 执行 crypto common 的 digest 业务逻辑；EN: Runs the digest business logic for crypto common.
  private digest(payload: string): Buffer {
    return createHmac(HMAC_ALGORITHM, this.secret).update(payload).digest();
  }

  // CN: 执行 crypto common 的 resolve secret 业务逻辑；EN: Runs the resolve secret business logic for crypto common.
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
