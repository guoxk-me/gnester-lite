import { extractBearerToken, MAX_BEARER_TOKEN_LENGTH } from './bearer-token';

describe('extractBearerToken', () => {
  it.each(['Bearer token', 'bearer token', 'BEARER token'])(
    'accepts the case-insensitive bearer scheme in %s',
    (authorization) => {
      expect(extractBearerToken(authorization)).toBe('token');
    },
  );

  it.each([
    undefined,
    '',
    'Basic token',
    'Bearer',
    'Bearer  token',
    ' Bearer token',
    'Bearer token trailing',
  ])('rejects malformed authorization value %s', (authorization) => {
    expect(extractBearerToken(authorization)).toBeUndefined();
  });

  it('rejects token values that exceed the unauthenticated input limit', () => {
    const maximumToken = 'a'.repeat(MAX_BEARER_TOKEN_LENGTH);
    const oversizedToken = `${maximumToken}a`;

    expect(extractBearerToken(`Bearer ${maximumToken}`)).toBe(maximumToken);
    expect(extractBearerToken(`Bearer ${oversizedToken}`)).toBeUndefined();
  });
});
