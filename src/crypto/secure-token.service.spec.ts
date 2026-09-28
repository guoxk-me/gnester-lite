import { SecureTokenService } from './secure-token.service';

describe('SecureTokenService', () => {
  let service: SecureTokenService;

  beforeEach(() => {
    service = new SecureTokenService();
  });

  it('generates URL-safe random tokens with the requested entropy', () => {
    const first = service.generateUrlSafeToken(32);
    const second = service.generateUrlSafeToken(32);

    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(43);
  });

  it('hashes one-time tokens for storage and verifies only the original token', () => {
    const token = service.generateUrlSafeToken(32);
    const digest = service.hashToken(token);

    expect(digest).toMatch(/^sha256:[A-Za-z0-9_-]+$/);
    expect(digest).not.toContain(token);
    expect(service.verifyToken(token, digest)).toBe(true);
    expect(service.verifyToken(`${token}x`, digest)).toBe(false);
  });

  it.each([
    (digest: string) => `${digest}!`,
    (digest: string) => `${digest}:trailing`,
    (digest: string) => `${digest}=`,
  ])('rejects a malformed stored digest', (malformedDigest) => {
    const token = 'one-time-token';
    const digest = service.hashToken(token);

    expect(service.verifyToken(token, malformedDigest(digest))).toBe(false);
  });

  it('rejects a non-canonical base64url digest that decodes to the same bytes', () => {
    const token = 'one-time-token';
    const digest = service.hashToken(token);
    const [algorithm, encodedDigest] = digest.split(':');
    const alphabet =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const finalCharacterIndex = alphabet.indexOf(encodedDigest.at(-1) ?? '');
    const alternateFinalCharacter = alphabet[finalCharacterIndex + 1];
    const nonCanonicalDigest = `${algorithm}:${encodedDigest.slice(0, -1)}${alternateFinalCharacter}`;

    expect(Buffer.from(nonCanonicalDigest.split(':')[1], 'base64url')).toEqual(
      Buffer.from(encodedDigest, 'base64url'),
    );
    expect(service.verifyToken(token, nonCanonicalDigest)).toBe(false);
  });
});
