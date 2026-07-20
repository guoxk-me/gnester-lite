// CN: 服务，承载 auth common 的业务逻辑；EN: Service holds business logic for auth common.
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { Injectable } from '@nestjs/common';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

@Injectable()
export class PasswordHashService {
  // CN: 执行 auth common 的 hash 业务逻辑；EN: Runs the hash business logic for auth common.
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('base64url');
    const derivedKey = (await scryptAsync(
      password,
      salt,
      KEY_LENGTH,
    )) as Buffer;

    return `scrypt$${salt}$${derivedKey.toString('base64url')}`;
  }

  // CN: 执行 auth common 的 verify 业务逻辑；EN: Runs the verify business logic for auth common.
  async verify(password: string, storedHash: string): Promise<boolean> {
    const [, salt, expectedKey] = storedHash.split('$');

    if (!salt || !expectedKey) {
      return false;
    }

    const actual = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
    const expected = Buffer.from(expectedKey, 'base64url');

    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }
}
