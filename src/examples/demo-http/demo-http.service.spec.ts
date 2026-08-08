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

function createResponse<ResponseBody>(
  data: ResponseBody,
  status = 200,
): AxiosResponse<ResponseBody> {
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

  beforeEach(() => {
    jest.clearAllMocks();
    configService.getOrThrow.mockReturnValue(
      'https://jsonplaceholder.typicode.com',
    );
    service = new DemoHttpService(
      httpService as unknown as HttpService,
      configService as unknown as ConfigService,
    );
  });

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

  it('uses axiosRef for a low-level provider status check', async () => {
    httpService.axiosRef.get.mockResolvedValueOnce(createResponse({}, 200));
    configService.getOrThrow.mockReturnValueOnce(
      'https://user:private-value@jsonplaceholder.typicode.com?token=private-value#diagnostic',
    );

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

  it('maps upstream timeouts to GatewayTimeoutException', async () => {
    httpService.get.mockReturnValueOnce(
      throwError(() => createAxiosError('ECONNABORTED')),
    );

    await expect(service.findPost(1)).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );
  });

  it('maps upstream HTTP failures to BadGatewayException', async () => {
    httpService.get.mockReturnValueOnce(
      throwError(() => createAxiosError('ERR_BAD_RESPONSE', 502)),
    );

    await expect(service.findPost(1)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  // AI modified: proves compile-time Axios generics cannot admit malformed runtime payloads.
  it('rejects upstream payloads that violate the response contract', async () => {
    httpService.get.mockReturnValueOnce(
      of(
        createResponse({
          id: '1',
          unexpected: true,
        }),
      ),
    );

    await expect(service.findPost(1)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('rejects complete upstream payloads with numeric fields encoded as strings', async () => {
    httpService.get.mockReturnValueOnce(
      of(
        createResponse({
          userId: '1',
          id: '1',
          title: 'demo',
          body: 'body',
        }),
      ),
    );

    await expect(service.findPost(1)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('rejects upstream payloads with unsafe numeric identifiers', async () => {
    httpService.get.mockReturnValueOnce(
      of(
        createResponse({
          userId: 1,
          id: Number.MAX_SAFE_INTEGER + 1,
          title: 'demo',
          body: 'body',
        }),
      ),
    );

    await expect(service.findPost(1)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('rejects non-array upstream list payloads', async () => {
    httpService.get.mockReturnValueOnce(
      of(createResponse({ unexpected: true })),
    );

    await expect(service.findPosts({})).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
