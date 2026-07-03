// CN: 测试文件，验证 demo-http 的行为契约；EN: Test file verifies behavior contracts for demo-http.
import { BadGatewayException, GatewayTimeoutException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { DemoHttpService } from './demo-http.service';

type MockHttpService = Pick<HttpService, 'get' | 'post'> & {
  readonly axiosRef: {
    readonly get: jest.Mock;
  };
};

// CN: 准备或验证 demo-http 的 create response 测试逻辑；EN: Prepares or verifies the create response test logic for demo-http.
function createResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Created',
    headers: {},
    config: {
      headers: new AxiosHeaders(),
    },
  };
}

// CN: 准备或验证 demo-http 的 create axios error 测试逻辑；EN: Prepares or verifies the create axios error test logic for demo-http.
function createAxiosError(
  code: string | undefined,
  status?: number,
): AxiosError {
  return new AxiosError(
    'upstream failed',
    code,
    {
      url: '/posts',
      method: 'get',
      headers: new AxiosHeaders(),
    },
    undefined,
    status
      ? {
          data: {},
          status,
          statusText: 'Bad Gateway',
          headers: {},
          config: {
            headers: new AxiosHeaders(),
          },
        }
      : undefined,
  );
}

// CN: 测试分组：DemoHttpService；EN: Test group: DemoHttpService.
describe('DemoHttpService', () => {
  const httpService: jest.Mocked<MockHttpService> = {
    get: jest.fn(),
    post: jest.fn(),
    axiosRef: {
      get: jest.fn(),
    },
  };
  const configService: jest.Mocked<Pick<ConfigService, 'getOrThrow'>> = {
    getOrThrow: jest.fn(),
  };
  let service: DemoHttpService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    jest.clearAllMocks();
    configService.getOrThrow.mockReturnValue(
      'https://jsonplaceholder.typicode.com',
    );
    service = new DemoHttpService(
      httpService as unknown as HttpService,
      configService as ConfigService,
    );
  });

  // CN: 测试用例：describes the common outbound HTTP scenarios exposed by the demo；EN: Test case: describes the common outbound HTTP scenarios exposed by the demo.
  it('describes the common outbound HTTP scenarios exposed by the demo', () => {
    const scenarios = service.getScenarios();

    expect(scenarios.map((scenario) => scenario.name)).toEqual([
      'typed GET with query params',
      'typed GET by id',
      'POST JSON body',
      'direct Axios instance access',
    ]);
    const queryScenario = scenarios.find(
      (scenario) => scenario.route === '/demo-http/posts?userId=1',
    );

    expect(queryScenario?.nestPattern).toContain('HttpService.get<T>()');
  });

  // CN: 测试用例：calls the upstream list endpoint with typed query params；EN: Test case: calls the upstream list endpoint with typed query params.
  it('calls the upstream list endpoint with typed query params', async () => {
    const posts = [
      {
        userId: 1,
        id: 1,
        title: 'demo',
        body: 'body',
      },
    ];
    httpService.get.mockReturnValueOnce(of(createResponse(posts)));

    await expect(service.findPosts({ userId: 1 })).resolves.toEqual(posts);
    expect(httpService.get).toHaveBeenCalledWith('/posts', {
      params: { userId: 1 },
    });
  });

  // CN: 测试用例：calls the upstream detail endpoint for a single resource；EN: Test case: calls the upstream detail endpoint for a single resource.
  it('calls the upstream detail endpoint for a single resource', async () => {
    const post = {
      userId: 1,
      id: 1,
      title: 'demo',
      body: 'body',
    };
    httpService.get.mockReturnValueOnce(of(createResponse(post)));

    await expect(service.findPost(1)).resolves.toEqual(post);
    expect(httpService.get).toHaveBeenCalledWith('/posts/1');
  });

  // CN: 测试用例：posts a validated JSON body to the upstream service；EN: Test case: posts a validated JSON body to the upstream service.
  it('posts a validated JSON body to the upstream service', async () => {
    const createPostDto = {
      userId: 1,
      title: 'demo',
      body: 'body',
    };
    const createdPost = {
      ...createPostDto,
      id: 101,
    };
    httpService.post.mockReturnValueOnce(of(createResponse(createdPost, 201)));

    await expect(service.createPost(createPostDto)).resolves.toEqual(
      createdPost,
    );
    expect(httpService.post).toHaveBeenCalledWith('/posts', createPostDto);
  });

  // CN: 测试用例：uses axiosRef for a low-level provider status check；EN: Test case: uses axiosRef for a low-level provider status check.
  it('uses axiosRef for a low-level provider status check', async () => {
    httpService.axiosRef.get.mockResolvedValueOnce(createResponse({}, 200));

    await expect(service.getProviderStatus()).resolves.toEqual({
      providerBaseUrl: 'https://jsonplaceholder.typicode.com',
      status: 200,
      statusText: 'OK',
      reachable: true,
    });
    expect(httpService.axiosRef.get).toHaveBeenCalledWith('/posts/1', {
      validateStatus: expect.any(Function) as unknown,
    });
    expect(configService.getOrThrow).toHaveBeenCalledWith('http.baseUrl');
  });

  // CN: 测试用例：maps upstream timeouts to GatewayTimeoutException；EN: Test case: maps upstream timeouts to GatewayTimeoutException.
  it('maps upstream timeouts to GatewayTimeoutException', async () => {
    httpService.get.mockReturnValueOnce(
      throwError(() => createAxiosError('ECONNABORTED')),
    );

    await expect(service.findPost(1)).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );
  });

  // CN: 测试用例：maps upstream HTTP failures to BadGatewayException；EN: Test case: maps upstream HTTP failures to BadGatewayException.
  it('maps upstream HTTP failures to BadGatewayException', async () => {
    httpService.get.mockReturnValueOnce(
      throwError(() => createAxiosError('ERR_BAD_RESPONSE', 502)),
    );

    await expect(service.findPost(1)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
