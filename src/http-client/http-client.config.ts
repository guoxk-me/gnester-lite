import { HttpModuleOptions } from '@nestjs/axios';
import { HttpConfig } from 'config/config.types';

// AI modified: extracted factory so outbound axios options can be unit-tested like rate-limit/logger configs.
export function createHttpModuleOptions(config: HttpConfig): HttpModuleOptions {
  return {
    baseURL: config.baseUrl,
    timeout: config.timeout,
    maxRedirects: config.maxRedirects,
    maxContentLength: config.maxContentLength,
    maxBodyLength: config.maxBodyLength,
  };
}
