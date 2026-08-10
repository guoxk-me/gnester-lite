import {
  Controller,
  Get,
  StreamableFile,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { DemoStreamingFileScenarioDto } from './dto/demo-streaming-file-scenario.dto';
import { createDemoStreamableFile } from './demo-streaming-files.http';
import { DemoStreamingFilesService } from './demo-streaming-files.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-streaming-files',
})
export class DemoStreamingFilesController {
  constructor(
    private readonly demoStreamingFilesService: DemoStreamingFilesService,
  ) {}

  @Get()
  listScenarios(): DemoStreamingFileScenarioDto[] {
    return this.demoStreamingFilesService.listScenarios();
  }

  @Get('project/package-json')
  // AI modified: document missing packaged files as an explicit download failure.
  @ApiResponse({
    status: 404,
    description: 'Packaged project file was not found',
  })
  @ApiResponse({
    status: 200,
    // AI modified: describe the streamed body and download headers instead of an empty JSON response.
    content: {
      'application/json': {
        schema: { type: 'string', format: 'binary' },
      },
    },
    headers: {
      'Content-Disposition': {
        description: 'Attachment filename',
        schema: {
          type: 'string',
          example: 'attachment; filename="package.json"',
        },
      },
      'Content-Length': {
        description: 'File size in bytes',
        schema: { type: 'integer', minimum: 0 },
      },
    },
  })
  async downloadPackageJson(): Promise<StreamableFile> {
    const file =
      await this.demoStreamingFilesService.createPackageJsonDownload();

    return createDemoStreamableFile(file);
  }

  @Get('project/readme')
  @ApiResponse({
    status: 404,
    description: 'Packaged project file was not found',
  })
  @ApiResponse({
    status: 200,
    content: {
      'text/markdown': {
        schema: { type: 'string', format: 'binary' },
      },
    },
    headers: {
      'Content-Disposition': {
        description: 'Inline preview filename',
        schema: {
          type: 'string',
          example: 'inline; filename="README.md"',
        },
      },
      'Content-Length': {
        description: 'File size in bytes',
        schema: { type: 'integer', minimum: 0 },
      },
    },
  })
  async previewReadme(): Promise<StreamableFile> {
    const file = await this.demoStreamingFilesService.createReadmePreview();

    return createDemoStreamableFile(file);
  }

  @Get('generated/report.csv')
  @ApiResponse({
    status: 200,
    content: {
      'text/csv': {
        schema: { type: 'string', format: 'binary' },
      },
    },
    headers: {
      'Content-Disposition': {
        description: 'Attachment filename',
        schema: {
          type: 'string',
          example: 'attachment; filename="demo-report.csv"',
        },
      },
      'Content-Length': {
        description: 'Generated file size in bytes',
        schema: { type: 'integer', minimum: 0 },
      },
    },
  })
  downloadGeneratedCsv(): StreamableFile {
    return createDemoStreamableFile(
      this.demoStreamingFilesService.createGeneratedCsvDownload(),
    );
  }

  @Get('generated/note.txt')
  @ApiResponse({
    status: 200,
    content: {
      'text/plain': {
        schema: { type: 'string', format: 'binary' },
      },
    },
    headers: {
      'Content-Disposition': {
        description: 'Attachment filename',
        schema: {
          type: 'string',
          example: 'attachment; filename="demo-note.txt"',
        },
      },
      'Content-Length': {
        description: 'Generated file size in bytes',
        schema: { type: 'integer', minimum: 0 },
      },
    },
  })
  downloadGeneratedNote(): StreamableFile {
    return createDemoStreamableFile(
      this.demoStreamingFilesService.createGeneratedNoteDownload(),
    );
  }
}
