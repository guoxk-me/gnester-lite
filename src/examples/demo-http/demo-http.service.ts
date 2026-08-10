import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosResponse } from 'axios';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Observable, firstValueFrom } from 'rxjs';
import { CreateDemoHttpPostDto } from './dto/create-demo-http-post.dto';
import { DemoHttpPostDto } from './dto/demo-http-post.dto';
import { DemoHttpProviderStatusDto } from './dto/demo-http-provider-status.dto';
import { DemoHttpScenarioDto } from './dto/demo-http-scenario.dto';
import { ListDemoHttpPostsQueryDto } from './dto/list-demo-http-posts-query.dto';

@Injectable()
export class DemoHttpService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

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

  async findPosts(
    listPostsQuery: ListDemoHttpPostsQueryDto,
  ): Promise<DemoHttpPostDto[]> {
    const posts = await this.request(
      this.httpService.get<unknown>('/posts', {
        params: listPostsQuery,
      }),
      'listing demo posts',
    );

    if (!Array.isArray(posts)) {
      throw this.createContractException('listing demo posts');
    }

    return posts.map((post) =>
      this.validatePostContract(post, 'listing demo posts'),
    );
  }

  async findPost(id: number): Promise<DemoHttpPostDto> {
    const post = await this.request(
      this.httpService.get<unknown>(`/posts/${id}`),
      `reading demo post ${id}`,
    );

    return this.validatePostContract(post, `reading demo post ${id}`);
  }

  async createPost(
    createPostDto: CreateDemoHttpPostDto,
  ): Promise<DemoHttpPostDto> {
    const post = await this.request(
      this.httpService.post<unknown>('/posts', createPostDto),
      'creating a demo post',
    );

    return this.validatePostContract(post, 'creating a demo post');
  }

  async getProviderStatus(): Promise<DemoHttpProviderStatusDto> {
    try {
      const response = await this.httpService.axiosRef.get<unknown>(
        '/posts/1',
        {
          validateStatus: (status) => status < 500,
        },
      );
      const providerEndpoint = new URL(
        this.configService.getOrThrow<string>('http.baseUrl'),
      );
      // AI modified: diagnostics expose the endpoint location without URL credentials, query secrets, or fragments.
      providerEndpoint.username = '';
      providerEndpoint.password = '';
      providerEndpoint.search = '';
      providerEndpoint.hash = '';

      return {
        providerBaseUrl: providerEndpoint.toString().replace(/\/$/, ''),
        status: response.status,
        statusText: response.statusText,
        reachable: response.status >= 200 && response.status < 500,
      };
    } catch (error) {
      throw this.toHttpException(error, 'checking upstream provider status');
    }
  }

  private async request<ResponseBody>(
    source$: Observable<AxiosResponse<ResponseBody>>,
    action: string,
  ): Promise<ResponseBody> {
    try {
      const { data } = await firstValueFrom(source$);

      return data;
    } catch (error) {
      throw this.toHttpException(error, action);
    }
  }

  private validatePostContract(
    response: unknown,
    action: string,
  ): DemoHttpPostDto {
    if (
      typeof response !== 'object' ||
      response === null ||
      Array.isArray(response)
    ) {
      throw this.createContractException(action);
    }

    const post = plainToInstance(DemoHttpPostDto, response);
    const validationErrors = validateSync(post, {
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      whitelist: true,
    });

    if (validationErrors.length > 0) {
      // AI modified: fail closed when the upstream payload drifts from the public response contract.
      throw this.createContractException(action);
    }

    return post;
  }

  private createContractException(action: string): BadGatewayException {
    return new BadGatewayException({
      message: `Upstream response contract failed while ${action}`,
    });
  }

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

  private getUpstreamFailure(error: AxiosError): Record<string, unknown> {
    return {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      code: error.code,
    };
  }

  private isAxiosError(error: unknown): error is AxiosError {
    return (
      typeof error === 'object' && error !== null && 'isAxiosError' in error
    );
  }
}
