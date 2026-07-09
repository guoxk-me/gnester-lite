// CN: 项目文件，支持 security common 的实现；EN: Project file supports implementation for security common.
import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import { Environment } from 'config/config.types';
import { createHelmetOptions } from './helmet-options';

// CN: 执行 security common 的 apply security middleware 逻辑；EN: Runs the apply security middleware logic for security common.
export function applySecurityMiddleware(
  app: Pick<INestApplication, 'use'>,
  nodeEnv: Environment,
): void {
  app.use(helmet(createHelmetOptions(nodeEnv)));
}
