import { HttpStatus, ParseFilePipeBuilder } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

import {
  DEMO_UPLOAD_IMAGE_FILE_TYPES,
  DEMO_UPLOAD_MAX_CHUNK_SIZE_BYTES,
  DEMO_UPLOAD_MAX_FIELD_NAME_BYTES,
  DEMO_UPLOAD_MAX_FILES,
  DEMO_UPLOAD_MAX_FILE_SIZE_BYTES,
  DEMO_UPLOAD_MAX_FORM_FIELDS,
  DEMO_UPLOAD_MAX_FORM_FIELD_SIZE_BYTES,
} from './demo-upload.constants';

// AI modified: keeps HTTP upload validation outside the controller so routes stay declarative.
export const demoUploadMulterOptions: MulterOptions = {
  limits: {
    // AI modified: file-only routes reject unbounded text parts before Multer buffers them.
    fieldNameSize: DEMO_UPLOAD_MAX_FIELD_NAME_BYTES,
    fields: 0,
    fileSize: DEMO_UPLOAD_MAX_FILE_SIZE_BYTES,
    files: DEMO_UPLOAD_MAX_FILES,
    // Busboy emits partsLimit when the counter reaches this value.
    parts: DEMO_UPLOAD_MAX_FILES + 1,
  },
};

export const demoUploadChunkMulterOptions: MulterOptions = {
  limits: {
    fieldNameSize: DEMO_UPLOAD_MAX_FIELD_NAME_BYTES,
    fields: 0,
    fileSize: DEMO_UPLOAD_MAX_CHUNK_SIZE_BYTES,
    files: 1,
    parts: 2,
  },
};

export const demoUploadFormMulterOptions: MulterOptions = {
  limits: {
    // AI modified: form-only demos bound both the number and size of in-memory fields.
    fieldNameSize: DEMO_UPLOAD_MAX_FIELD_NAME_BYTES,
    fieldSize: DEMO_UPLOAD_MAX_FORM_FIELD_SIZE_BYTES,
    fields: DEMO_UPLOAD_MAX_FORM_FIELDS,
    files: 0,
    parts: DEMO_UPLOAD_MAX_FORM_FIELDS + 1,
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
    // AI modified: client-controlled MIME metadata must never override failed magic-byte detection.
    fallbackToMimetype: false,
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
