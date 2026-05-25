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
  constructor(private readonly demoCacheService: DemoCacheService) {}

  @Post()
  create(
    @Body() createDemoCacheDto: CreateDemoCacheDto,
  ): Promise<DemoCacheItemDto> {
    return this.demoCacheService.create(createDemoCacheDto);
  }

  @Get()
  findAll(): Promise<DemoCacheItemDto[]> {
    return this.demoCacheService.findAll();
  }

  @Get(':key')
  findOne(@Param('key') key: string): Promise<DemoCacheItemDto> {
    return this.demoCacheService.findOne(key);
  }

  @Patch(':key')
  update(
    @Param('key') key: string,
    @Body() updateDemoCacheDto: UpdateDemoCacheDto,
  ): Promise<DemoCacheItemDto> {
    return this.demoCacheService.update(key, updateDemoCacheDto);
  }

  @Delete(':key')
  remove(@Param('key') key: string): Promise<void> {
    return this.demoCacheService.remove(key);
  }
}
