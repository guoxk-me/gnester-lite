import type { HelmetOptions } from 'helmet';
import { Environment } from 'config/config.types';

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
