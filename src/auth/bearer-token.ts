const BEARER_AUTHORIZATION_PATTERN = /^Bearer ([^\s]+)$/i;

export const MAX_BEARER_TOKEN_LENGTH = 4096;

export function extractBearerToken(
  authorization: string | undefined,
): string | undefined {
  const token = BEARER_AUTHORIZATION_PATTERN.exec(authorization ?? '')?.[1];

  // AI modified: bound unauthenticated token input before JWT parsing.
  if (!token || token.length > MAX_BEARER_TOKEN_LENGTH) {
    return undefined;
  }

  return token;
}
