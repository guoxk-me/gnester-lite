import { createHttpModuleOptions } from './http-client.config';

describe('createHttpModuleOptions', () => {
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
