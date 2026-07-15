// CN: 配置文件，生成 AsyncAPI 文档并暴露可导入的 JSON/YAML 端点。
// EN: Config file generates AsyncAPI documentation and exposes importable JSON/YAML endpoints.
import type { NestExpressApplication } from '@nestjs/platform-express';
import yaml from 'js-yaml';
import { AsyncApiDocumentBuilder, AsyncApiModule } from 'nestjs-asyncapi';

import { Environment } from 'config/config.types';

const asyncApiIndex = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>gnester-lite WebSocket API</title>
  </head>
  <body>
    <main>
      <h1>gnester-lite WebSocket API</h1>
      <p>Import the generated AsyncAPI document using one of these endpoints:</p>
      <ul>
        <li><a href="/async-api-json">AsyncAPI JSON</a></li>
        <li><a href="/async-api-yaml">AsyncAPI YAML</a></li>
      </ul>
    </main>
  </body>
</html>`;

// CN: 非生产环境下注册 WebSocket AsyncAPI 文档端点。
// EN: Registers WebSocket AsyncAPI documentation endpoints outside production.
export function setupAsyncApi(
  app: NestExpressApplication,
  nodeEnv: Environment,
  port: number,
): void {
  if (nodeEnv === Environment.Production) {
    return;
  }

  const asyncApiOptions = new AsyncApiDocumentBuilder()
    .setTitle('gnester-lite WebSocket API')
    .setDescription(
      'Socket.IO WebSocket API reference — namespace `/demo-websocket`',
    )
    .setVersion('1.0.0')
    .setDefaultContentType('application/json')
    .addBearerAuth()
    .addServer('local', {
      host: `localhost:${port}`,
      pathname: '/demo-websocket',
      protocol: 'socket.io',
      security: [{ $ref: '#/components/securitySchemes/bearer' }],
    })
    .build();
  const asyncApiDocument = AsyncApiModule.createDocument(app, asyncApiOptions);
  const asyncApiYaml = yaml.dump(asyncApiDocument);
  const expressApplication = app.getHttpAdapter().getInstance();

  // AI modified: avoid the upstream Node 24 HTML generator failure while keeping import endpoints available.
  expressApplication.get('/async-api', (_request, response) => {
    response.type('html').send(asyncApiIndex);
  });
  expressApplication.get('/async-api-json', (_request, response) => {
    response.json(asyncApiDocument);
  });
  expressApplication.get('/async-api-yaml', (_request, response) => {
    response.type('text/yaml').send(asyncApiYaml);
  });
}
