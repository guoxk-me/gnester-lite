import { Module } from '@nestjs/common';
import { DemoUploadController } from './demo-upload.controller.js';
import { DemoUploadService } from './demo-upload.service.js';
import { DemoUploadChunkStorage } from './demo-upload.storage.js';

@Module({
  controllers: [DemoUploadController],
  // AI modified: storage is a separate provider so upload workflow and filesystem strategy stay apart.
  providers: [DemoUploadChunkStorage, DemoUploadService],
})
export class DemoUploadModule {}
