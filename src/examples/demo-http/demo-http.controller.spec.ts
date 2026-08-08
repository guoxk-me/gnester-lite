import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  DEMO_HTTP_POST_MAX_BODY_LENGTH,
  DEMO_HTTP_POST_MAX_ID,
  DEMO_HTTP_POST_MAX_TITLE_LENGTH,
} from './demo-http.constants';
import { DemoHttpController } from './demo-http.controller';
import { DemoHttpService } from './demo-http.service';
import { CreateDemoHttpPostDto } from './dto/create-demo-http-post.dto';
import { DemoHttpPostParamsDto } from './dto/demo-http-post-params.dto';
import { ListDemoHttpPostsQueryDto } from './dto/list-demo-http-posts-query.dto';

describe('DemoHttpController', () => {
  const service: jest.Mocked<
    Pick<
      DemoHttpService,
      | 'getScenarios'
      | 'getProviderStatus'
      | 'findPosts'
      | 'findPost'
      | 'createPost'
    >
  > = {
    getScenarios: jest.fn(),
    getProviderStatus: jest.fn(),
    findPosts: jest.fn(),
    findPost: jest.fn(),
    createPost: jest.fn(),
  };
  let controller: DemoHttpController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoHttpController],
      providers: [
        {
          provide: DemoHttpService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoHttpController>(DemoHttpController);
  });

  it('delegates scenario discovery to the service', () => {
    service.getScenarios.mockReturnValueOnce([]);

    expect(controller.getScenarios()).toEqual([]);
    expect(service.getScenarios).toHaveBeenCalled();
  });

  it('delegates provider status checks to the service', async () => {
    const status = {
      providerBaseUrl: 'https://jsonplaceholder.typicode.com',
      status: 200,
      statusText: 'OK',
      reachable: true,
    };
    service.getProviderStatus.mockResolvedValueOnce(status);

    await expect(controller.getProviderStatus()).resolves.toEqual(status);
    expect(service.getProviderStatus).toHaveBeenCalled();
  });

  it('delegates filtered post listing to the service', async () => {
    service.findPosts.mockResolvedValueOnce([]);

    await expect(controller.findPosts({ userId: 1 })).resolves.toEqual([]);
    expect(service.findPosts).toHaveBeenCalledWith({ userId: 1 });
  });

  it('delegates single post reads to the service', async () => {
    const post = {
      userId: 1,
      id: 1,
      title: 'demo',
      body: 'body',
    };
    service.findPost.mockResolvedValueOnce(post);

    await expect(controller.findPost({ id: 1 })).resolves.toEqual(post);
    expect(service.findPost).toHaveBeenCalledWith(1);
  });

  it('delegates post creation to the service', async () => {
    const createPostDto = {
      userId: 1,
      title: 'demo',
      body: 'body',
    };
    const post = {
      ...createPostDto,
      id: 101,
    };
    service.createPost.mockResolvedValueOnce(post);

    await expect(controller.createPost(createPostDto)).resolves.toEqual(post);
    expect(service.createPost).toHaveBeenCalledWith(createPostDto);
  });

  it.each([
    [
      'unsafe user id',
      {
        userId: DEMO_HTTP_POST_MAX_ID + 1,
        title: 'demo',
        body: 'body',
      },
    ],
    [
      'blank title',
      {
        userId: 1,
        title: '   ',
        body: 'body',
      },
    ],
    [
      'overlong title',
      {
        userId: 1,
        title: 'x'.repeat(DEMO_HTTP_POST_MAX_TITLE_LENGTH + 1),
        body: 'body',
      },
    ],
    [
      'blank body',
      {
        userId: 1,
        title: 'demo',
        body: '   ',
      },
    ],
    [
      'overlong body',
      {
        userId: 1,
        title: 'demo',
        body: 'x'.repeat(DEMO_HTTP_POST_MAX_BODY_LENGTH + 1),
      },
    ],
  ])('rejects a %s create-post contract', async (_scenario, payload) => {
    const dto = plainToInstance(CreateDemoHttpPostDto, payload);

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it.each(['0', '-1', '9007199254740993'])(
    'rejects the out-of-domain post path id %s',
    async (id) => {
      const params = plainToInstance(DemoHttpPostParamsDto, { id });

      await expect(validate(params)).resolves.not.toHaveLength(0);
    },
  );

  it('rejects an unsafe list user id before an upstream request', async () => {
    const query = plainToInstance(ListDemoHttpPostsQueryDto, {
      userId: '9007199254740993',
    });

    await expect(validate(query)).resolves.not.toHaveLength(0);
  });
});
