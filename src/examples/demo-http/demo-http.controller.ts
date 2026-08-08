import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiParam, ApiResponse } from '@nestjs/swagger';
import { DEMO_HTTP_POST_MAX_ID } from './demo-http.constants';
import { CreateDemoHttpPostDto } from './dto/create-demo-http-post.dto';
import { DemoHttpPostParamsDto } from './dto/demo-http-post-params.dto';
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
  constructor(private readonly demoHttpService: DemoHttpService) {}

  @Get('scenarios')
  getScenarios(): DemoHttpScenarioDto[] {
    return this.demoHttpService.getScenarios();
  }

  @Get('provider-status')
  // AI modified: document the finite upstream failure contract.
  @ApiResponse({ status: 502, description: 'Upstream provider failed' })
  @ApiResponse({ status: 504, description: 'Upstream provider timed out' })
  @ApiResponse({ status: 200, type: DemoHttpProviderStatusDto })
  getProviderStatus(): Promise<DemoHttpProviderStatusDto> {
    return this.demoHttpService.getProviderStatus();
  }

  @Get('posts')
  @ApiResponse({ status: 502, description: 'Upstream provider failed' })
  @ApiResponse({ status: 504, description: 'Upstream provider timed out' })
  @ApiResponse({ status: 200, type: DemoHttpPostDto, isArray: true })
  findPosts(
    @Query() listPostsQuery: ListDemoHttpPostsQueryDto,
  ): Promise<DemoHttpPostDto[]> {
    return this.demoHttpService.findPosts(listPostsQuery);
  }

  @Get('posts/:id')
  @ApiResponse({ status: 502, description: 'Upstream provider failed' })
  @ApiResponse({ status: 504, description: 'Upstream provider timed out' })
  @ApiResponse({ status: 200, type: DemoHttpPostDto })
  @ApiParam({
    name: 'id',
    schema: {
      type: 'integer',
      minimum: 1,
      maximum: DEMO_HTTP_POST_MAX_ID,
    },
  })
  findPost(@Param() params: DemoHttpPostParamsDto): Promise<DemoHttpPostDto> {
    // AI modified: validate the path before interpolating an upstream resource identifier.
    return this.demoHttpService.findPost(params.id);
  }

  @Post('posts')
  @ApiResponse({ status: 502, description: 'Upstream provider failed' })
  @ApiResponse({ status: 504, description: 'Upstream provider timed out' })
  @ApiResponse({ status: 201, type: DemoHttpPostDto })
  createPost(
    @Body() createPostDto: CreateDemoHttpPostDto,
  ): Promise<DemoHttpPostDto> {
    return this.demoHttpService.createPost(createPostDto);
  }
}
