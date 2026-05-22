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
  ParseBoolPipe,
  ParseUUIDPipe,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { BulkCreateDemoDto } from './dto/bulk-create-demo.dto';
import { CreateDemoDto } from './dto/create-demo.dto';
import {
  CreateDemoWithAuditDto,
  DemoNameOnlyDto,
  UpdateDemoDescriptionDto,
} from './dto/demo-mapped-types.dto';
import { FindDemoParamsDto } from './dto/find-demo-params.dto';
import { ListDemoQueryDto } from './dto/list-demo-query.dto';
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

  @Post('with-audit')
  createWithAudit(
    @Body() createDemoDto: CreateDemoWithAuditDto,
  ): Promise<Demo> {
    return this.demoDatabaseService.create({
      name: createDemoDto.name,
      description: createDemoDto.description,
    });
  }

  @Post('name-only')
  createNameOnly(@Body() demoNameOnlyDto: DemoNameOnlyDto): DemoNameOnlyDto {
    return demoNameOnlyDto;
  }

  @Post('many')
  createMany(
    @Body(new ParseArrayPipe({ items: CreateDemoDto }))
    createDemoDtos: CreateDemoDto[],
  ): Promise<Demo[]> {
    return this.demoDatabaseService.createMany(createDemoDtos);
  }

  @Post('many/wrapped')
  createManyWrapped(
    @Body() bulkCreateDemoDto: BulkCreateDemoDto,
  ): Promise<Demo[]> {
    return this.demoDatabaseService.createMany(bulkCreateDemoDto.items);
  }

  @Get()
  findAll(): Promise<Demo[]> {
    return this.demoDatabaseService.findAll();
  }

  @Get('page')
  findPage(@Query() query: ListDemoQueryDto): Promise<DemoPage> {
    return this.demoDatabaseService.findPage(
      query.page,
      query.limit,
      query.order,
    );
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

  @Get('flags')
  parseFlag(@Query('enabled', ParseBoolPipe) enabled: boolean): {
    readonly enabled: boolean;
  } {
    return { enabled };
  }

  @Get('uuid/:id')
  parseUuid(@Param('id', ParseUUIDPipe) id: string): { readonly id: string } {
    return { id };
  }

  @Get(':id')
  findOne(@Param() params: FindDemoParamsDto): Promise<Demo> {
    return this.demoDatabaseService.findOne(Number(params.id));
  }

  @Patch(':id/description')
  updateDescription(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDemoDescriptionDto: UpdateDemoDescriptionDto,
  ): Promise<Demo> {
    return this.demoDatabaseService.update(id, updateDemoDescriptionDto);
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
