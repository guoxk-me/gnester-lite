import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { Injectable } from '@nestjs/common';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

@Injectable()
export class PasswordHashService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('base64url');
    const derivedKey = (await scryptAsync(
      password,
      salt,
      KEY_LENGTH,
    )) as Buffer;

    return `scrypt$${salt}$${derivedKey.toString('base64url')}`;
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    if (!storedHash.startsWith('scrypt$')) {
      // AI modified: existing account passwords remain usable after removing Better Auth.
      const [legacySalt, legacyKey] = storedHash.split(':');
      if (!legacySalt || !legacyKey) return false;
      const actual = await new Promise<Buffer>((resolve, reject) => {
        scrypt(
          password.normalize('NFKC'),
          legacySalt,
          KEY_LENGTH,
          { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
          (error, key) => (error ? reject(error) : resolve(key)),
        );
      });
      const expected = Buffer.from(legacyKey, 'hex');
      return (
        actual.length === expected.length && timingSafeEqual(actual, expected)
      );
    }
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
