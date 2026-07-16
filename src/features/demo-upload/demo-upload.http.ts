// CN: HTTP 边界文件，集中 demo-upload 的拦截器配置和文件管道；EN: HTTP boundary file centralizes demo-upload interceptor options and file pipes.
import { HttpStatus, ParseFilePipeBuilder } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

import {
  DEMO_UPLOAD_IMAGE_FILE_TYPES,
  DEMO_UPLOAD_MAX_CHUNK_SIZE_BYTES,
  DEMO_UPLOAD_MAX_FILES,
  DEMO_UPLOAD_MAX_FILE_SIZE_BYTES,
} from './demo-upload.constants';

// AI modified: keeps HTTP upload validation outside the controller so routes stay declarative.
export const demoUploadMulterOptions: MulterOptions = {
  limits: {
    fileSize: DEMO_UPLOAD_MAX_FILE_SIZE_BYTES,
    files: DEMO_UPLOAD_MAX_FILES,
  },
};

export const demoUploadChunkMulterOptions: MulterOptions = {
  limits: {
    fileSize: DEMO_UPLOAD_MAX_CHUNK_SIZE_BYTES,
    files: 1,
  },
};

export const demoUploadRequiredFilePipe = new ParseFilePipeBuilder()
  .addMaxSizeValidator({
    maxSize: DEMO_UPLOAD_MAX_FILE_SIZE_BYTES,
  })
  .build({
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  });

export const demoUploadRequiredImageFilePipe = new ParseFilePipeBuilder()
  .addFileTypeValidator({
    fileType: DEMO_UPLOAD_IMAGE_FILE_TYPES,
    fallbackToMimetype: true,
  })
  .addMaxSizeValidator({
    maxSize: DEMO_UPLOAD_MAX_FILE_SIZE_BYTES,
  })
  .build({
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  });

export const demoUploadRequiredChunkFilePipe = new ParseFilePipeBuilder()
  .addMaxSizeValidator({
    maxSize: DEMO_UPLOAD_MAX_CHUNK_SIZE_BYTES,
  })
  .build({
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  });
