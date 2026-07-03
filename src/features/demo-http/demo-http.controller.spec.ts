// CN: 测试文件，验证 demo-http 的行为契约；EN: Test file verifies behavior contracts for demo-http.
import { Test, TestingModule } from '@nestjs/testing';
import { DemoHttpController } from './demo-http.controller';
import { DemoHttpService } from './demo-http.service';

// CN: 测试分组：DemoHttpController；EN: Test group: DemoHttpController.
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

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
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

  // CN: 测试用例：delegates scenario discovery to the service；EN: Test case: delegates scenario discovery to the service.
  it('delegates scenario discovery to the service', () => {
    service.getScenarios.mockReturnValueOnce([]);

    expect(controller.getScenarios()).toEqual([]);
    expect(service.getScenarios).toHaveBeenCalled();
  });

  // CN: 测试用例：delegates provider status checks to the service；EN: Test case: delegates provider status checks to the service.
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

  // CN: 测试用例：delegates filtered post listing to the service；EN: Test case: delegates filtered post listing to the service.
  it('delegates filtered post listing to the service', async () => {
    service.findPosts.mockResolvedValueOnce([]);

    await expect(controller.findPosts({ userId: 1 })).resolves.toEqual([]);
    expect(service.findPosts).toHaveBeenCalledWith({ userId: 1 });
  });

  // CN: 测试用例：delegates single post reads to the service；EN: Test case: delegates single post reads to the service.
  it('delegates single post reads to the service', async () => {
    const post = {
      userId: 1,
      id: 1,
      title: 'demo',
      body: 'body',
    };
    service.findPost.mockResolvedValueOnce(post);

    await expect(controller.findPost(1)).resolves.toEqual(post);
    expect(service.findPost).toHaveBeenCalledWith(1);
  });

  // CN: 测试用例：delegates post creation to the service；EN: Test case: delegates post creation to the service.
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
});
