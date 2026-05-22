import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  ParseArrayPipe,
  DefaultValuePipe,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { CreateDemoDto } from './dto/create-demo.dto';
import { UpdateDemoDto } from './dto/update-demo.dto';
import { DemoDatabaseService, DemoPage } from './demo-database.service';
import { Demo } from './entities/demo.entity';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-database',
})
export class DemoDatabaseController {
  constructor(private readonly demoDatabaseService: DemoDatabaseService) {}

  @Post()
  create(@Body() createDemoDto: CreateDemoDto): Promise<Demo> {
    return this.demoDatabaseService.create(createDemoDto);
  }

  @Post('many')
  createMany(
    @Body(new ParseArrayPipe({ items: CreateDemoDto }))
    createDemoDtos: CreateDemoDto[],
  ): Promise<Demo[]> {
    return this.demoDatabaseService.createMany(createDemoDtos);
  }

  @Get()
  findAll(): Promise<Demo[]> {
    return this.demoDatabaseService.findAll();
  }

  @Get('page')
  findPage(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<DemoPage> {
    return this.demoDatabaseService.findPage(page, limit);
  }

  @Get('by-ids')
  findManyByIds(
    @Query('ids', new ParseArrayPipe({ items: Number, separator: ',' }))
    ids: number[],
  ): Promise<Demo[]> {
    return this.demoDatabaseService.findManyByIds(ids);
  }

  @Get('search')
  searchByName(@Query('keyword') keyword: string): Promise<Demo[]> {
    return this.demoDatabaseService.searchByName(keyword);
  }

  @Get('count')
  async count(): Promise<{ readonly count: number }> {
    const count = await this.demoDatabaseService.count();

    return { count };
  }

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
