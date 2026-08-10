import { Module } from '@nestjs/common';
import { DemoStreamingFilesController } from './demo-streaming-files.controller';
import { DemoStreamingFilesService } from './demo-streaming-files.service';

@Module({
  controllers: [DemoStreamingFilesController],
  providers: [DemoStreamingFilesService],
})
export class DemoStreamingFilesModule {}
