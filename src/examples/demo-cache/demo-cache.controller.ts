import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseInterceptors,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { CacheTTL } from '@nestjs/cache-manager';
import { ApiParam, ApiResponse } from '@nestjs/swagger';

import { HttpCacheInterceptor } from '../../platform/infrastructure/cache/http-cache.interceptor';
import {
  CreateDemoCacheDto,
  DEMO_CACHE_KEY_MAX_LENGTH,
} from './dto/create-demo-cache.dto';
import { DemoCacheItemDto } from './dto/demo-cache-item.dto';
import { DemoHttpCacheResponseDto } from './dto/demo-http-cache-response.dto';
import {
  DemoCacheKeyParamsDto,
  DemoCacheVariantParamsDto,
} from './dto/demo-cache-params.dto';
import { UpdateDemoCacheDto } from './dto/update-demo-cache.dto';
import { DemoCacheService } from './demo-cache.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-cache',
})
export class DemoCacheController {
  constructor(private readonly demoCacheService: DemoCacheService) {}

  @Post()
  @ApiResponse({
    status: 409,
    description: 'The bounded demo cache is full',
  })
  @ApiResponse({ status: 503, description: 'Cache backend is unavailable' })
  @ApiResponse({ status: 201, type: DemoCacheItemDto })
  create(
    @Body() createDemoCacheDto: CreateDemoCacheDto,
  ): Promise<DemoCacheItemDto> {
    return this.demoCacheService.create(createDemoCacheDto);
  }

  @Get()
  @ApiResponse({
    status: 200,
    type: DemoCacheItemDto,
    isArray: true,
    description: 'Returns at most 100 tracked demo cache entries',
  })
  @ApiResponse({ status: 503, description: 'Cache backend is unavailable' })
  findAll(): Promise<DemoCacheItemDto[]> {
    return this.demoCacheService.findAll();
  }

  // AI modified: use an immutable demonstration response so CRUD mutations cannot leave stale entries.
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(5_000)
  @Get('http-response/:variant')
  @ApiParam({
    name: 'variant',
    schema: {
      type: 'string',
      minLength: 1,
      maxLength: DEMO_CACHE_KEY_MAX_LENGTH,
      pattern: '^[a-zA-Z0-9:_-]+$',
    },
  })
  getHttpResponse(
    @Param() params: DemoCacheVariantParamsDto,
  ): DemoHttpCacheResponseDto {
    return this.demoCacheService.getHttpResponse(params.variant);
  }

  @Get(':key')
  // AI modified: document cache misses surfaced by the service boundary.
  @ApiResponse({ status: 404, description: 'Demo cache item was not found' })
  @ApiResponse({ status: 503, description: 'Cache backend is unavailable' })
  @ApiResponse({ status: 200, type: DemoCacheItemDto })
  @ApiParam({
    name: 'key',
    schema: {
      type: 'string',
      minLength: 1,
      maxLength: DEMO_CACHE_KEY_MAX_LENGTH,
      pattern: '^[a-zA-Z0-9:_-]+$',
    },
  })
  findOne(@Param() params: DemoCacheKeyParamsDto): Promise<DemoCacheItemDto> {
    return this.demoCacheService.findOne(params.key);
  }

  @Patch(':key')
  @ApiResponse({ status: 409, description: 'The bounded demo cache is full' })
  @ApiResponse({ status: 503, description: 'Cache backend is unavailable' })
  @ApiResponse({ status: 404, description: 'Demo cache item was not found' })
  @ApiResponse({ status: 200, type: DemoCacheItemDto })
  @ApiParam({
    name: 'key',
    schema: {
      type: 'string',
      minLength: 1,
      maxLength: DEMO_CACHE_KEY_MAX_LENGTH,
      pattern: '^[a-zA-Z0-9:_-]+$',
    },
  })
  update(
    @Param() params: DemoCacheKeyParamsDto,
    @Body() updateDemoCacheDto: UpdateDemoCacheDto,
  ): Promise<DemoCacheItemDto> {
    return this.demoCacheService.update(params.key, updateDemoCacheDto);
  }

  @Delete(':key')
  @ApiResponse({ status: 404, description: 'Demo cache item was not found' })
  @ApiResponse({ status: 503, description: 'Cache backend is unavailable' })
  @ApiResponse({ status: 200, description: 'Demo cache item was removed' })
  @ApiParam({
    name: 'key',
    schema: {
      type: 'string',
      minLength: 1,
      maxLength: DEMO_CACHE_KEY_MAX_LENGTH,
      pattern: '^[a-zA-Z0-9:_-]+$',
    },
  })
  remove(@Param() params: DemoCacheKeyParamsDto): Promise<void> {
    // AI modified: CRUD paths now enforce the same cache-key domain as creation.
    return this.demoCacheService.remove(params.key);
  }
}
