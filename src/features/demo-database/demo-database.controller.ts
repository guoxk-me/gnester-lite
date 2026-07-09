// CN: 控制器，定义 demo-database 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-database.
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
import { DemoCountDto } from './dto/demo-count.dto';
import { DemoFlagDto } from './dto/demo-flag.dto';
import {
  CreateDemoWithAuditDto,
  DemoNameOnlyDto,
  UpdateDemoDescriptionDto,
} from './dto/demo-mapped-types.dto';
import { DemoPageDto } from './dto/demo-page.dto';
import { DemoUuidDto } from './dto/demo-uuid.dto';
import { ListDemoQueryDto } from './dto/list-demo-query.dto';
import { UpdateDemoDto } from './dto/update-demo.dto';
import { DemoDatabaseService } from './demo-database.service';
import { Demo } from './entities/demo.entity';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-database',
})
export class DemoDatabaseController {
  // CN: 初始化 demo-database 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-database.
  constructor(private readonly demoDatabaseService: DemoDatabaseService) {}

  // CN: 处理 demo-database 的 create HTTP 请求；EN: Handles the create HTTP request for demo-database.
  @Post()
  create(@Body() createDemoDto: CreateDemoDto): Promise<Demo> {
    return this.demoDatabaseService.create(createDemoDto);
  }

  // CN: 处理 demo-database 的 create with audit HTTP 请求；EN: Handles the create with audit HTTP request for demo-database.
  @Post('with-audit')
  createWithAudit(
    @Body() createDemoDto: CreateDemoWithAuditDto,
  ): Promise<Demo> {
    return this.demoDatabaseService.createWithAudit(createDemoDto);
  }

  // CN: 处理 demo-database 的 create name only HTTP 请求；EN: Handles the create name only HTTP request for demo-database.
  @Post('name-only')
  createNameOnly(@Body() demoNameOnlyDto: DemoNameOnlyDto): DemoNameOnlyDto {
    return this.demoDatabaseService.createNameOnly(demoNameOnlyDto);
  }

  // CN: 处理 demo-database 的 create many HTTP 请求；EN: Handles the create many HTTP request for demo-database.
  @Post('many')
  createMany(
    @Body(new ParseArrayPipe({ items: CreateDemoDto }))
    createDemoDtos: CreateDemoDto[],
  ): Promise<Demo[]> {
    return this.demoDatabaseService.createMany(createDemoDtos);
  }

  // CN: 处理 demo-database 的 create many wrapped HTTP 请求；EN: Handles the create many wrapped HTTP request for demo-database.
  @Post('many/wrapped')
  createManyWrapped(
    @Body() bulkCreateDemoDto: BulkCreateDemoDto,
  ): Promise<Demo[]> {
    return this.demoDatabaseService.createMany(bulkCreateDemoDto.items);
  }

  // CN: 处理 demo-database 的 find all HTTP 请求；EN: Handles the find all HTTP request for demo-database.
  @Get()
  findAll(): Promise<Demo[]> {
    return this.demoDatabaseService.findAll();
  }

  // CN: 处理 demo-database 的 find page HTTP 请求；EN: Handles the find page HTTP request for demo-database.
  @Get('page')
  findPage(@Query() query: ListDemoQueryDto): Promise<DemoPageDto> {
    return this.demoDatabaseService.findPage(
      query.page,
      query.limit,
      query.order,
    );
  }

  // CN: 处理 demo-database 的 find many by ids HTTP 请求；EN: Handles the find many by ids HTTP request for demo-database.
  @Get('by-ids')
  findManyByIds(
    @Query('ids', new ParseArrayPipe({ items: Number, separator: ',' }))
    ids: number[],
  ): Promise<Demo[]> {
    return this.demoDatabaseService.findManyByIds(ids);
  }

  // CN: 处理 demo-database 的 search by name HTTP 请求；EN: Handles the search by name HTTP request for demo-database.
  @Get('search')
  searchByName(@Query('keyword') keyword: string): Promise<Demo[]> {
    return this.demoDatabaseService.searchByName(keyword);
  }

  // CN: 处理 demo-database 的 count HTTP 请求；EN: Handles the count HTTP request for demo-database.
  @Get('count')
  count(): Promise<DemoCountDto> {
    return this.demoDatabaseService.countSummary();
  }

  // CN: 处理 demo-database 的 parse flag HTTP 请求；EN: Handles the parse flag HTTP request for demo-database.
  @Get('flags')
  parseFlag(@Query('enabled', ParseBoolPipe) enabled: boolean): DemoFlagDto {
    return this.demoDatabaseService.parseFlag(enabled);
  }

  // CN: 处理 demo-database 的 parse uuid HTTP 请求；EN: Handles the parse uuid HTTP request for demo-database.
  @Get('uuid/:id')
  parseUuid(@Param('id', ParseUUIDPipe) id: string): DemoUuidDto {
    return this.demoDatabaseService.parseUuid(id);
  }

  // CN: 处理 demo-database 的 find one HTTP 请求；EN: Handles the find one HTTP request for demo-database.
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Demo> {
    return this.demoDatabaseService.findOne(id);
  }

  // CN: 处理 demo-database 的 update description HTTP 请求；EN: Handles the update description HTTP request for demo-database.
  @Patch(':id/description')
  updateDescription(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDemoDescriptionDto: UpdateDemoDescriptionDto,
  ): Promise<Demo> {
    return this.demoDatabaseService.update(id, updateDemoDescriptionDto);
  }

  // CN: 处理 demo-database 的 update HTTP 请求；EN: Handles the update HTTP request for demo-database.
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDemoDto: UpdateDemoDto,
  ): Promise<Demo> {
    return this.demoDatabaseService.update(id, updateDemoDto);
  }

  // CN: 处理 demo-database 的 remove HTTP 请求；EN: Handles the remove HTTP request for demo-database.
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.demoDatabaseService.remove(id);
  }
}
