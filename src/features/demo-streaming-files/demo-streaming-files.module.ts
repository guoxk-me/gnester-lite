import { Module } from '@nestjs/common';
import { DemoStreamingFilesController } from './demo-streaming-files.controller';
import { DemoStreamingFilesService } from './demo-streaming-files.service';

// CN: 演示安全流式文件响应；EN: Demonstrates safe streamed file responses.
@Module({
  controllers: [DemoStreamingFilesController],
  providers: [DemoStreamingFilesService],
})
export class DemoStreamingFilesModule {}
