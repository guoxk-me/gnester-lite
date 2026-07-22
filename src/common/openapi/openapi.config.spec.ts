// CN: 测试文件，验证 openapi common 的行为契约；EN: Test file verifies behavior contracts for openapi common.
import { INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';

import { Environment } from 'config/config.types';
import { setupOpenApi } from './openapi.config';

// CN: 测试分组：setupOpenApi；EN: Test group: setupOpenApi.
describe('setupOpenApi', () => {
  const app = {} as INestApplication;

  // CN: 测试清理，组织或验证测试流程；EN: Test cleanup organizes or verifies the test flow.
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // CN: 测试用例：registers OpenAPI documentation outside production；EN: Test case: registers OpenAPI documentation outside production.
  it('registers OpenAPI documentation outside production', () => {
    const document = { openapi: '3.0.0' };
    const createDocument = jest
      .spyOn(SwaggerModule, 'createDocument')
      .mockReturnValue(document as never);
    const setup = jest.spyOn(SwaggerModule, 'setup').mockImplementation();

    setupOpenApi(app, Environment.Development);

    expect(createDocument).toHaveBeenCalledWith(app, expect.any(Object));
    expect(setup).toHaveBeenCalledWith('docs', app, document, {
      jsonDocumentUrl: 'docs-json',
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  });

  // CN: 测试用例：does not expose OpenAPI documentation in production by default；EN: Test case: does not expose OpenAPI documentation in production by default.
  it('does not expose OpenAPI documentation in production by default', () => {
    const createDocument = jest.spyOn(SwaggerModule, 'createDocument');
    const setup = jest.spyOn(SwaggerModule, 'setup');

    setupOpenApi(app, Environment.Production);

    expect(createDocument).not.toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();
  });
});
