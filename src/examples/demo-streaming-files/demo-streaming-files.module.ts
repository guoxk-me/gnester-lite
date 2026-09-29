import { Module } from '@nestjs/common';
import { DemoStreamingFilesController } from './demo-streaming-files.controller.js';
import { DemoStreamingFilesService } from './demo-streaming-files.service.js';

@Module({
  controllers: [DemoStreamingFilesController],
  providers: [DemoStreamingFilesService],
})
export class DemoStreamingFilesModule {}
