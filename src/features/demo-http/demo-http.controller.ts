// CN: 控制器，定义 demo-http 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-http.
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { CreateDemoHttpPostDto } from './dto/create-demo-http-post.dto';
import { DemoHttpPostDto } from './dto/demo-http-post.dto';
import { DemoHttpProviderStatusDto } from './dto/demo-http-provider-status.dto';
import { DemoHttpScenarioDto } from './dto/demo-http-scenario.dto';
import { ListDemoHttpPostsQueryDto } from './dto/list-demo-http-posts-query.dto';
import { DemoHttpService } from './demo-http.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-http',
})
export class DemoHttpController {
  // CN: 初始化 demo-http 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-http.
  constructor(private readonly demoHttpService: DemoHttpService) {}

  // CN: 处理 demo-http 的 get scenarios HTTP 请求；EN: Handles the get scenarios HTTP request for demo-http.
  @Get('scenarios')
  getScenarios(): DemoHttpScenarioDto[] {
    return this.demoHttpService.getScenarios();
  }

  // CN: 处理 demo-http 的 get provider status HTTP 请求；EN: Handles the get provider status HTTP request for demo-http.
  @Get('provider-status')
  getProviderStatus(): Promise<DemoHttpProviderStatusDto> {
    return this.demoHttpService.getProviderStatus();
  }

  // CN: 处理 demo-http 的 find posts HTTP 请求；EN: Handles the find posts HTTP request for demo-http.
  @Get('posts')
  findPosts(
    @Query() listPostsQuery: ListDemoHttpPostsQueryDto,
  ): Promise<DemoHttpPostDto[]> {
    return this.demoHttpService.findPosts(listPostsQuery);
  }

  // CN: 处理 demo-http 的 find post HTTP 请求；EN: Handles the find post HTTP request for demo-http.
  @Get('posts/:id')
  findPost(@Param('id', ParseIntPipe) id: number): Promise<DemoHttpPostDto> {
    return this.demoHttpService.findPost(id);
  }

  // CN: 处理 demo-http 的 create post HTTP 请求；EN: Handles the create post HTTP request for demo-http.
  @Post('posts')
  createPost(
    @Body() createPostDto: CreateDemoHttpPostDto,
  ): Promise<DemoHttpPostDto> {
    return this.demoHttpService.createPost(createPostDto);
  }
}
