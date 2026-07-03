// CN: 控制器，定义 demo-streaming-files 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-streaming-files.
import {
  Controller,
  Get,
  StreamableFile,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { DemoStreamingFileScenarioDto } from './dto/demo-streaming-file-scenario.dto';
import { createDemoStreamableFile } from './demo-streaming-files.http';
import { DemoStreamingFilesService } from './demo-streaming-files.service';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-streaming-files',
})
export class DemoStreamingFilesController {
  // CN: 初始化 demo-streaming-files 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-streaming-files.
  constructor(
    private readonly demoStreamingFilesService: DemoStreamingFilesService,
  ) {}

  // CN: 处理 demo-streaming-files 的 list scenarios HTTP 请求；EN: Handles the list scenarios HTTP request for demo-streaming-files.
  @Get()
  listScenarios(): DemoStreamingFileScenarioDto[] {
    return this.demoStreamingFilesService.listScenarios();
  }

  // CN: 处理 demo-streaming-files 的 download package json HTTP 请求；EN: Handles the download package json HTTP request for demo-streaming-files.
  @Get('project/package-json')
  async downloadPackageJson(): Promise<StreamableFile> {
    const file =
      await this.demoStreamingFilesService.createPackageJsonDownload();

    return createDemoStreamableFile(file);
  }

  // CN: 处理 demo-streaming-files 的 preview readme HTTP 请求；EN: Handles the preview readme HTTP request for demo-streaming-files.
  @Get('project/readme')
  async previewReadme(): Promise<StreamableFile> {
    const file = await this.demoStreamingFilesService.createReadmePreview();

    return createDemoStreamableFile(file);
  }

  // CN: 处理 demo-streaming-files 的 download generated csv HTTP 请求；EN: Handles the download generated csv HTTP request for demo-streaming-files.
  @Get('generated/report.csv')
  downloadGeneratedCsv(): StreamableFile {
    return createDemoStreamableFile(
      this.demoStreamingFilesService.createGeneratedCsvDownload(),
    );
  }

  // CN: 处理 demo-streaming-files 的 download generated note HTTP 请求；EN: Handles the download generated note HTTP request for demo-streaming-files.
  @Get('generated/note.txt')
  downloadGeneratedNote(): StreamableFile {
    return createDemoStreamableFile(
      this.demoStreamingFilesService.createGeneratedNoteDownload(),
    );
  }
}
