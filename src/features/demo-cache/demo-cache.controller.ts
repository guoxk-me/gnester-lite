// CN: 控制器，定义 demo-cache 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-cache.
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { CreateDemoCacheDto } from './dto/create-demo-cache.dto';
import { DemoCacheItemDto } from './dto/demo-cache-item.dto';
import { UpdateDemoCacheDto } from './dto/update-demo-cache.dto';
import { DemoCacheService } from './demo-cache.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-cache',
})
export class DemoCacheController {
  // CN: 初始化 demo-cache 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-cache.
  constructor(private readonly demoCacheService: DemoCacheService) {}

  // CN: 处理 demo-cache 的 create HTTP 请求；EN: Handles the create HTTP request for demo-cache.
  @Post()
  create(
    @Body() createDemoCacheDto: CreateDemoCacheDto,
  ): Promise<DemoCacheItemDto> {
    return this.demoCacheService.create(createDemoCacheDto);
  }

  // CN: 处理 demo-cache 的 find all HTTP 请求；EN: Handles the find all HTTP request for demo-cache.
  @Get()
  findAll(): Promise<DemoCacheItemDto[]> {
    return this.demoCacheService.findAll();
  }

  // CN: 处理 demo-cache 的 find one HTTP 请求；EN: Handles the find one HTTP request for demo-cache.
  @Get(':key')
  findOne(@Param('key') key: string): Promise<DemoCacheItemDto> {
    return this.demoCacheService.findOne(key);
  }

  // CN: 处理 demo-cache 的 update HTTP 请求；EN: Handles the update HTTP request for demo-cache.
  @Patch(':key')
  update(
    @Param('key') key: string,
    @Body() updateDemoCacheDto: UpdateDemoCacheDto,
  ): Promise<DemoCacheItemDto> {
    return this.demoCacheService.update(key, updateDemoCacheDto);
  }

  // CN: 处理 demo-cache 的 remove HTTP 请求；EN: Handles the remove HTTP request for demo-cache.
  @Delete(':key')
  remove(@Param('key') key: string): Promise<void> {
    return this.demoCacheService.remove(key);
  }
}
