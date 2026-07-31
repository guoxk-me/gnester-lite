import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { RateLimitConfig } from 'config/config.types';

function getStringProperty(
  request: Record<string, unknown>,
  property: string,
): string | undefined {
  const value = request[property];

  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getSocketRemoteAddress(
  request: Record<string, unknown>,
): string | undefined {
  const socket = request.socket;

  if (typeof socket !== 'object' || socket === null) {
    return undefined;
  }

  const remoteAddress = (socket as Record<string, unknown>).remoteAddress;

  return typeof remoteAddress === 'string' && remoteAddress.length > 0
    ? remoteAddress
    : undefined;
}

export function getClientIp(request: Record<string, unknown>): string {
  const ips = request.ips;

  if (Array.isArray(ips) && typeof ips[0] === 'string' && ips[0].length > 0) {
    return ips[0];
  }

  return (
    getStringProperty(request, 'ip') ??
    getSocketRemoteAddress(request) ??
    'unknown'
  );
}

export function createThrottlerModuleOptions(
  config: RateLimitConfig,
): ThrottlerModuleOptions {
  return {
    errorMessage: config.errorMessage,
    skipIf: () => !config.enabled,
    getTracker: (request) => getClientIp(request),
    throttlers: config.throttlers.map((throttler) => ({
      name: throttler.name,
      ttl: throttler.ttl,
      limit: throttler.limit,
      blockDuration: throttler.blockDuration,
    })),
  };
}
