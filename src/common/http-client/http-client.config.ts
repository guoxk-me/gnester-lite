// CN: 配置文件，生成 http-client common 的运行参数；EN: Config file builds runtime settings for http-client common.
import { HttpModuleOptions } from '@nestjs/axios';
import { HttpConfig } from 'config/config.types';

// CN: 生成或校验 http-client common 的 create http module options 配置；EN: Builds or validates the create http module options configuration for http-client common.
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
