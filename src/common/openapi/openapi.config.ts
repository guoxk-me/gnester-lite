// CN: 配置文件，生成 openapi common 的运行参数；EN: Config file builds runtime settings for openapi common.
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { Environment } from 'config/config.types';

// CN: 生成或校验 openapi common 的 setup open api 配置；EN: Builds or validates the setup open api configuration for openapi common.
export function setupOpenApi(
  app: INestApplication,
  nodeEnv: Environment,
): void {
  if (nodeEnv === Environment.Production) {
    return;
  }

  const openApiConfig = new DocumentBuilder()
    .setTitle('gnester-lite API')
    .setDescription('NestJS template API reference')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);

  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
