import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseArrayPipe,
  ParseBoolPipe,
  ParseUUIDPipe,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiParam,
  ApiQuery,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  BulkCreateDemoDto,
  DEMO_DATABASE_MAX_BATCH_SIZE,
} from './dto/bulk-create-demo.dto';
import { CreateDemoDto } from './dto/create-demo.dto';
import { DemoCountDto } from './dto/demo-count.dto';
import { DemoFlagDto } from './dto/demo-flag.dto';
import {
  DEMO_DATABASE_MAX_ID,
  DemoIdParamsDto,
} from './dto/demo-id-params.dto';
import {
  CreateDemoWithAuditDto,
  DemoNameOnlyDto,
  UpdateDemoDescriptionDto,
} from './dto/demo-mapped-types.dto';
import { DemoPageDto } from './dto/demo-page.dto';
import { DemoResponseDto } from './dto/demo-response.dto';
import { DemoUuidDto } from './dto/demo-uuid.dto';
import { ListDemoQueryDto } from './dto/list-demo-query.dto';
import { SearchDemoQueryDto } from './dto/search-demo-query.dto';
import { UpdateDemoDto } from './dto/update-demo.dto';
import {
  DEMO_DATABASE_MAX_UNPAGED_RESULTS,
  DemoDatabaseService,
} from './demo-database.service';

// AI modified: ParseArrayPipe owns an internal ValidationPipe, so raw array items must repeat the global boundary policy.
export const demoCreateManyPipe = new ParseArrayPipe({
  items: CreateDemoDto,
  whitelist: true,
  forbidNonWhitelisted: true,
  forbidUnknownValues: true,
  stopAtFirstError: true,
});

@ApiExtraModels(CreateDemoDto)
@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-database',
})
export class DemoDatabaseController {
  constructor(private readonly demoDatabaseService: DemoDatabaseService) {}

  @Post()
  async create(@Body() createDemoDto: CreateDemoDto): Promise<DemoResponseDto> {
    const demo = await this.demoDatabaseService.create(createDemoDto);

    // AI modified: explicitly construct the public contract so future entity columns stay private.
    return {
      id: demo.id,
      name: demo.name,
      description: demo.description,
    };
  }

  @Post('with-audit')
  async createWithAudit(
    @Body() createDemoDto: CreateDemoWithAuditDto,
  ): Promise<DemoResponseDto> {
    const demo = await this.demoDatabaseService.createWithAudit(createDemoDto);

    return {
      id: demo.id,
      name: demo.name,
      description: demo.description,
    };
  }

  @Post('name-only')
  createNameOnly(@Body() demoNameOnlyDto: DemoNameOnlyDto): DemoNameOnlyDto {
    return this.demoDatabaseService.createNameOnly(demoNameOnlyDto);
  }

  @Post('many')
  @ApiResponse({
    status: 400,
    description: 'Bulk create array is empty, oversized, or invalid',
  })
  @ApiResponse({ status: 201, type: DemoResponseDto, isArray: true })
  @ApiBody({
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(CreateDemoDto) },
      minItems: 1,
      maxItems: DEMO_DATABASE_MAX_BATCH_SIZE,
    },
  })
  async createMany(
    @Body(demoCreateManyPipe)
    createDemoDtos: CreateDemoDto[],
  ): Promise<DemoResponseDto[]> {
    if (
      createDemoDtos.length === 0 ||
      createDemoDtos.length > DEMO_DATABASE_MAX_BATCH_SIZE
    ) {
      // AI modified: keep the raw-array endpoint within the same bounded transaction size as the wrapped DTO.
      throw new BadRequestException(
        `Bulk create requires between 1 and ${DEMO_DATABASE_MAX_BATCH_SIZE} demos.`,
      );
    }

    const demos = await this.demoDatabaseService.createMany(createDemoDtos);

    return demos.map((demo) => ({
      id: demo.id,
      name: demo.name,
      description: demo.description,
    }));
  }

  @Post('many/wrapped')
  async createManyWrapped(
    @Body() bulkCreateDemoDto: BulkCreateDemoDto,
  ): Promise<DemoResponseDto[]> {
    const demos = await this.demoDatabaseService.createMany(
      bulkCreateDemoDto.items,
    );

    return demos.map((demo) => ({
      id: demo.id,
      name: demo.name,
      description: demo.description,
    }));
  }

  @Get()
  @ApiResponse({
    status: 200,
    type: DemoResponseDto,
    isArray: true,
    description: `Returns at most ${DEMO_DATABASE_MAX_UNPAGED_RESULTS} records; use /page for complete traversal`,
  })
  async findAll(): Promise<DemoResponseDto[]> {
    const demos = await this.demoDatabaseService.findAll();

    return demos.map((demo) => ({
      id: demo.id,
      name: demo.name,
      description: demo.description,
    }));
  }

  @Get('page')
  async findPage(@Query() query: ListDemoQueryDto): Promise<DemoPageDto> {
    const page = await this.demoDatabaseService.findPage(
      query.page,
      query.limit,
      query.order,
    );

    return {
      ...page,
      data: page.data.map((demo) => ({
        id: demo.id,
        name: demo.name,
        description: demo.description,
      })),
    };
  }

  @Get('by-ids')
  @ApiResponse({
    status: 400,
    description: 'ID list is empty, oversized, or contains an invalid ID',
  })
  @ApiResponse({ status: 200, type: DemoResponseDto, isArray: true })
  @ApiQuery({
    name: 'ids',
    required: true,
    style: 'form',
    explode: false,
    schema: {
      type: 'array',
      items: {
        type: 'integer',
        minimum: 1,
        maximum: DEMO_DATABASE_MAX_ID,
      },
      minItems: 1,
      maxItems: DEMO_DATABASE_MAX_BATCH_SIZE,
    },
  })
  async findManyByIds(
    @Query('ids', new ParseArrayPipe({ items: Number, separator: ',' }))
    ids: number[],
  ): Promise<DemoResponseDto[]> {
    if (
      ids.length === 0 ||
      ids.length > DEMO_DATABASE_MAX_BATCH_SIZE ||
      ids.some(
        (id) =>
          !Number.isSafeInteger(id) || id < 1 || id > DEMO_DATABASE_MAX_ID,
      )
    ) {
      // AI modified: bound the IN query and reject values outside the entity's positive integer id domain.
      throw new BadRequestException(
        `ids must contain between 1 and ${DEMO_DATABASE_MAX_BATCH_SIZE} positive integers.`,
      );
    }

    const demos = await this.demoDatabaseService.findManyByIds(ids);

    return demos.map((demo) => ({
      id: demo.id,
      name: demo.name,
      description: demo.description,
    }));
  }

  @Get('search')
  @ApiResponse({
    status: 200,
    type: DemoResponseDto,
    isArray: true,
    description: `Returns at most ${DEMO_DATABASE_MAX_UNPAGED_RESULTS} matching records`,
  })
  async searchByName(
    @Query() query: SearchDemoQueryDto,
  ): Promise<DemoResponseDto[]> {
    const demos = await this.demoDatabaseService.searchByName(query.keyword);

    return demos.map((demo) => ({
      id: demo.id,
      name: demo.name,
      description: demo.description,
    }));
  }

  @Get('count')
  count(): Promise<DemoCountDto> {
    return this.demoDatabaseService.countSummary();
  }

  @Get('flags')
  getFlag(@Query('enabled', ParseBoolPipe) isEnabled: boolean): DemoFlagDto {
    return { enabled: isEnabled };
  }

  @Get('uuid/:id')
  getUuid(@Param('id', ParseUUIDPipe) id: string): DemoUuidDto {
    return { id };
  }

  @Get(':id')
  // AI modified: document record misses from the database service.
  @ApiResponse({ status: 404, description: 'Demo record was not found' })
  @ApiResponse({ status: 200, type: DemoResponseDto })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer', minimum: 1, maximum: DEMO_DATABASE_MAX_ID },
  })
  async findOne(@Param() params: DemoIdParamsDto): Promise<DemoResponseDto> {
    const demo = await this.demoDatabaseService.findOne(params.id);

    return {
      id: demo.id,
      name: demo.name,
      description: demo.description,
    };
  }

  @Patch(':id/description')
  @ApiResponse({ status: 404, description: 'Demo record was not found' })
  @ApiResponse({ status: 200, type: DemoResponseDto })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer', minimum: 1, maximum: DEMO_DATABASE_MAX_ID },
  })
  async updateDescription(
    @Param() params: DemoIdParamsDto,
    @Body() updateDemoDescriptionDto: UpdateDemoDescriptionDto,
  ): Promise<DemoResponseDto> {
    const demo = await this.demoDatabaseService.update(
      params.id,
      updateDemoDescriptionDto,
    );

    return {
      id: demo.id,
      name: demo.name,
      description: demo.description,
    };
  }

  @Patch(':id')
  @ApiResponse({ status: 404, description: 'Demo record was not found' })
  @ApiResponse({ status: 200, type: DemoResponseDto })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer', minimum: 1, maximum: DEMO_DATABASE_MAX_ID },
  })
  async update(
    @Param() params: DemoIdParamsDto,
    @Body() updateDemoDto: UpdateDemoDto,
  ): Promise<DemoResponseDto> {
    const demo = await this.demoDatabaseService.update(
      params.id,
      updateDemoDto,
    );

    return {
      id: demo.id,
      name: demo.name,
      description: demo.description,
    };
  }

  @Delete(':id')
  @ApiResponse({ status: 404, description: 'Demo record was not found' })
  @ApiResponse({ status: 200, description: 'Demo record was removed' })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer', minimum: 1, maximum: DEMO_DATABASE_MAX_ID },
  })
  remove(@Param() params: DemoIdParamsDto): Promise<void> {
    // AI modified: all database ID paths now share the entity's positive signed-INT domain.
    return this.demoDatabaseService.remove(params.id);
  }
}
