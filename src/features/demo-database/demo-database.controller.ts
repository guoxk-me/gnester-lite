import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  ParseArrayPipe,
  Query,
  UseInterceptors,
  SerializeOptions,
  ClassSerializerInterceptor,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { CreateDemoDto } from './dto/create-demo.dto';
import { UpdateDemoDto } from './dto/update-demo.dto';
import { DemoDatabaseService } from './demo-database.service';
import { Demo } from './entities/demo.entity';

@Controller({
  // version: '1',
  // cancel versioning for this controller
  version: VERSION_NEUTRAL,
  path: 'demo-database',
})
export class DemoDatabaseController {
  constructor(private readonly demoDatabaseService: DemoDatabaseService) {}

  @Post()
  create(@Body() createDemoDto: CreateDemoDto): Promise<Demo> {
    return this.demoDatabaseService.create(createDemoDto);
  }

  @Version('2')
  @Get()
  findAll(): Promise<Demo[]> {
    return this.demoDatabaseService.findAll();
  }

  @Get('by-ids')
  findManyByIds(
    @Query('ids', new ParseArrayPipe({ items: Number, separator: ',' }))
    ids: number[],
  ): Promise<Demo[]> {
    return this.demoDatabaseService.findManyByIds(ids);
  }

  @Post('many')
  createMany(
    // Use ParseArrayPipe to validate an array of CreateDemoDto. 使用 ParseArrayPipe 校验 CreateDemoDto 数组。
    @Body(new ParseArrayPipe({ items: CreateDemoDto }))
    createDemoDtos: CreateDemoDto[],
  ): Promise<Demo[]> {
    return this.demoDatabaseService.createMany(createDemoDtos);
  }

  // Use SerializeOptions to exclude properties with specified prefixes. 使用 SerializeOptions 排除指定前缀的属性。
  @SerializeOptions({
    // Exclude properties with prefix '_'. 排除带有 '_' 前缀的属性。
    excludePrefixes: ['_'],
    // Use type Demo to specify the class for serialization. 使用 Demo 类型指定序列化类。
    type: Demo,
  })
  // Use ClassSerializerInterceptor to enable class-transformer decorators. 使用 ClassSerializerInterceptor 启用 class-transformer 装饰器。
  @UseInterceptors(ClassSerializerInterceptor)
  // Transform id to number using ParseIntPipe. 使用 ParseIntPipe 将 id 转为数字。
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Demo> {
    return this.demoDatabaseService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDemoDto: UpdateDemoDto,
  ): Promise<Demo> {
    return this.demoDatabaseService.update(id, updateDemoDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.demoDatabaseService.remove(id);
  }
}
