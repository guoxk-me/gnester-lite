// CN: 测试文件，验证 http-client common 的行为契约；EN: Test file verifies behavior contracts for http-client common.
import { createHttpModuleOptions } from './http-client.config';

// CN: 测试分组：createHttpModuleOptions；EN: Test group: createHttpModuleOptions.
describe('createHttpModuleOptions', () => {
  // CN: 测试用例：maps template http config to axios HttpModule options；EN: Test case: maps template http config to axios HttpModule options.
  it('maps template http config to axios HttpModule options', () => {
    expect(
      createHttpModuleOptions({
        baseUrl: 'https://jsonplaceholder.typicode.com',
        timeout: 5000,
        maxRedirects: 5,
        maxContentLength: 10485760,
        maxBodyLength: 10485760,
      }),
    ).toEqual({
      baseURL: 'https://jsonplaceholder.typicode.com',
      timeout: 5000,
      maxRedirects: 5,
      maxContentLength: 10485760,
      maxBodyLength: 10485760,
    });
  });
});
