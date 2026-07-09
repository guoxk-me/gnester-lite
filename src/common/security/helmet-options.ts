// CN: 项目文件，支持 security common 的实现；EN: Project file supports implementation for security common.
import type { HelmetOptions } from 'helmet';
import { Environment } from 'config/config.types';

// CN: 根据环境生成 Helmet 安全响应头配置；EN: Builds Helmet security header options from the environment.
export function createHelmetOptions(nodeEnv: Environment): HelmetOptions {
  const isProduction = nodeEnv === Environment.Production;

  return {
    contentSecurityPolicy: {
      directives: {
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    strictTransportSecurity: isProduction
      ? {
          includeSubDomains: true,
          maxAge: 31_536_000,
        }
      : false,
  };
}
