// CN: 配置文件，生成 rate-limit common 的运行参数；EN: Config file builds runtime settings for rate-limit common.
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { RateLimitConfig } from 'config/config.types';

// CN: 读取限流配置里的字符串属性；EN: Reads string properties from the rate-limit config.
function getStringProperty(
  request: Record<string, unknown>,
  property: string,
): string | undefined {
  const value = request[property];

  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

// CN: 生成或校验 rate-limit common 的 get socket remote address 配置；EN: Builds or validates the get socket remote address configuration for rate-limit common.
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

// CN: 生成或校验 rate-limit common 的 get client ip 配置；EN: Builds or validates the get client ip configuration for rate-limit common.
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

// CN: 生成或校验 rate-limit common 的 create throttler module options 配置；EN: Builds or validates the create throttler module options configuration for rate-limit common.
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
