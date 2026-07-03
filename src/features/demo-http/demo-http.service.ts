// CN: 服务，承载 demo-http 的业务逻辑；EN: Service holds business logic for demo-http.
import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosResponse } from 'axios';
import { Observable, firstValueFrom } from 'rxjs';
import { CreateDemoHttpPostDto } from './dto/create-demo-http-post.dto';
import { DemoHttpPostDto } from './dto/demo-http-post.dto';
import { DemoHttpProviderStatusDto } from './dto/demo-http-provider-status.dto';
import { DemoHttpScenarioDto } from './dto/demo-http-scenario.dto';
import { ListDemoHttpPostsQueryDto } from './dto/list-demo-http-posts-query.dto';

@Injectable()
export class DemoHttpService {
  // CN: 初始化 demo-http 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-http.
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // CN: 执行 demo-http 的 get scenarios 业务逻辑；EN: Runs the get scenarios business logic for demo-http.
  getScenarios(): DemoHttpScenarioDto[] {
    return [
      {
        name: 'typed GET with query params',
        method: 'GET',
        route: '/demo-http/posts?userId=1',
        useCase: 'Call an upstream REST list endpoint with optional filters.',
        nestPattern:
          'Controller validates query DTO, service calls HttpService.get<T>().',
      },
      {
        name: 'typed GET by id',
        method: 'GET',
        route: '/demo-http/posts/1',
        useCase: 'Fetch one upstream resource and map HTTP failures centrally.',
        nestPattern:
          'Use ParseIntPipe for path params and translate Axios errors in the service.',
      },
      {
        name: 'POST JSON body',
        method: 'POST',
        route: '/demo-http/posts',
        useCase: 'Send a validated request body to another HTTP service.',
        nestPattern:
          'Controller owns DTO validation, service owns outbound HTTP behavior.',
      },
      {
        name: 'direct Axios instance access',
        method: 'GET',
        route: '/demo-http/provider-status',
        useCase:
          'Use axiosRef for low-level Axios behavior when HttpService Observable helpers are not enough.',
        nestPattern:
          'Keep axiosRef usage behind a service method instead of exposing Axios to controllers.',
      },
    ];
  }

  // CN: 执行 demo-http 的 find posts 业务逻辑；EN: Runs the find posts business logic for demo-http.
  findPosts(
    listPostsQuery: ListDemoHttpPostsQueryDto,
  ): Promise<DemoHttpPostDto[]> {
    return this.request(
      this.httpService.get<DemoHttpPostDto[]>('/posts', {
        params: listPostsQuery,
      }),
      'listing demo posts',
    );
  }

  // CN: 执行 demo-http 的 find post 业务逻辑；EN: Runs the find post business logic for demo-http.
  findPost(id: number): Promise<DemoHttpPostDto> {
    return this.request(
      this.httpService.get<DemoHttpPostDto>(`/posts/${id}`),
      `reading demo post ${id}`,
    );
  }

  // CN: 执行 demo-http 的 create post 业务逻辑；EN: Runs the create post business logic for demo-http.
  createPost(createPostDto: CreateDemoHttpPostDto): Promise<DemoHttpPostDto> {
    return this.request(
      this.httpService.post<DemoHttpPostDto>('/posts', createPostDto),
      'creating a demo post',
    );
  }

  // CN: 执行 demo-http 的 get provider status 业务逻辑；EN: Runs the get provider status business logic for demo-http.
  async getProviderStatus(): Promise<DemoHttpProviderStatusDto> {
    try {
      const response = await this.httpService.axiosRef.get<unknown>(
        '/posts/1',
        {
          validateStatus: (status) => status < 500,
        },
      );

      return {
        providerBaseUrl: this.configService.getOrThrow<string>('http.baseUrl'),
        status: response.status,
        statusText: response.statusText,
        reachable: response.status >= 200 && response.status < 500,
      };
    } catch (error) {
      throw this.toHttpException(error, 'checking upstream provider status');
    }
  }

  // CN: 执行 demo-http 的 request 业务逻辑；EN: Runs the request business logic for demo-http.
  private async request<T>(
    source$: Observable<AxiosResponse<T>>,
    action: string,
  ): Promise<T> {
    try {
      const { data } = await firstValueFrom(source$);

      return data;
    } catch (error) {
      throw this.toHttpException(error, action);
    }
  }

  // CN: 执行 demo-http 的 to http exception 业务逻辑；EN: Runs the to http exception business logic for demo-http.
  private toHttpException(error: unknown, action: string): Error {
    if (!this.isAxiosError(error)) {
      return new BadGatewayException({
        message: `Unexpected upstream error while ${action}`,
      });
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new GatewayTimeoutException({
        message: `Upstream request timed out while ${action}`,
        upstream: this.getUpstreamFailure(error),
      });
    }

    return new BadGatewayException({
      message: `Upstream request failed while ${action}`,
      upstream: this.getUpstreamFailure(error),
    });
  }

  // CN: 执行 demo-http 的 get upstream failure 业务逻辑；EN: Runs the get upstream failure business logic for demo-http.
  private getUpstreamFailure(error: AxiosError): Record<string, unknown> {
    return {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      code: error.code,
    };
  }

  // CN: 执行 demo-http 的 is axios error 业务逻辑；EN: Runs the is axios error business logic for demo-http.
  private isAxiosError(error: unknown): error is AxiosError {
    return (
      typeof error === 'object' && error !== null && 'isAxiosError' in error
    );
  }
}
