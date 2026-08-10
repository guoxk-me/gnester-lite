import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  AnyFilesInterceptor,
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
  NoFilesInterceptor,
} from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiParam, ApiResponse } from '@nestjs/swagger';
import {
  DEMO_UPLOAD_CHUNK_FIELD_NAME,
  DEMO_UPLOAD_MAX_FILES,
  DEMO_UPLOAD_MAX_FORM_FIELDS,
} from './demo-upload.constants';
import {
  demoUploadChunkMulterOptions,
  demoUploadFormMulterOptions,
  demoUploadMulterOptions,
  demoUploadRequiredChunkFilePipe,
  demoUploadRequiredFilePipe,
  demoUploadRequiredImageFilePipe,
} from './demo-upload.http';
import { DemoUploadService } from './demo-upload.service';
import { CreateDemoChunkedUploadDto } from './dto/create-demo-chunked-upload.dto';
import { DemoChunkedUploadCompleteDto } from './dto/demo-chunked-upload-complete.dto';
import { DemoChunkedUploadSessionDto } from './dto/demo-chunked-upload-session.dto';
import { DemoMultipartFormDto } from './dto/demo-multipart-form.dto';
import { DemoUploadFileDto } from './dto/demo-upload-file.dto';
import { DemoUploadFileFieldsDto } from './dto/demo-upload-file-fields.dto';
import { DemoUploadFilesDto } from './dto/demo-upload-files.dto';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-upload',
})
export class DemoUploadController {
  constructor(private readonly demoUploadService: DemoUploadService) {}

  // AI modified: controller now declares upload routes while validation/storage live in dedicated boundaries.
  @Post('chunked/sessions')
  // AI modified: expose bounded upload workflow failures in the HTTP contract.
  @ApiResponse({
    status: 400,
    description: 'Chunk count does not match the declared file and chunk sizes',
  })
  @ApiResponse({
    status: 503,
    description: 'Upload capacity is exhausted or the service is shutting down',
  })
  @ApiResponse({ status: 201, type: DemoChunkedUploadSessionDto })
  createChunkedUploadSession(
    @Body() dto: CreateDemoChunkedUploadDto,
  ): Promise<DemoChunkedUploadSessionDto> {
    return this.demoUploadService.startChunkedUpload(dto);
  }

  @Put('chunked/:uploadId/chunks/:chunkIndex')
  // AI modified: Multer request shapes are not inferred by the Swagger plugin.
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      required: [DEMO_UPLOAD_CHUNK_FIELD_NAME],
      properties: {
        [DEMO_UPLOAD_CHUNK_FIELD_NAME]: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiParam({ name: 'uploadId', format: 'uuid' })
  @ApiParam({
    name: 'chunkIndex',
    schema: { type: 'integer', minimum: 0 },
  })
  @ApiResponse({ status: 400, description: 'Chunk index or size is invalid' })
  @ApiResponse({ status: 404, description: 'Chunked upload was not found' })
  @ApiResponse({
    status: 409,
    description: 'Chunked upload is not accepting changes',
  })
  @ApiResponse({ status: 410, description: 'Chunked upload has expired' })
  @ApiResponse({ status: 413, description: 'Chunk file is too large' })
  @ApiResponse({
    status: 422,
    description: 'Required chunk file is missing or invalid',
  })
  @ApiResponse({
    status: 503,
    description: 'Chunked upload service is shutting down',
  })
  @ApiResponse({ status: 200, type: DemoChunkedUploadSessionDto })
  @UseInterceptors(
    FileInterceptor(DEMO_UPLOAD_CHUNK_FIELD_NAME, demoUploadChunkMulterOptions),
  )
  receiveChunk(
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
    @Param('chunkIndex', ParseIntPipe) chunkIndex: number,
    @UploadedFile(demoUploadRequiredChunkFilePipe)
    file: Express.Multer.File,
  ): Promise<DemoChunkedUploadSessionDto> {
    return this.demoUploadService.receiveChunk(uploadId, chunkIndex, file);
  }

  @Get('chunked/:uploadId')
  @ApiParam({ name: 'uploadId', format: 'uuid' })
  @ApiResponse({ status: 400, description: 'Upload identifier is invalid' })
  @ApiResponse({ status: 404, description: 'Chunked upload was not found' })
  @ApiResponse({ status: 410, description: 'Chunked upload has expired' })
  @ApiResponse({
    status: 503,
    description: 'Chunked upload service is shutting down',
  })
  @ApiResponse({ status: 200, type: DemoChunkedUploadSessionDto })
  getChunkedUploadSession(
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
  ): Promise<DemoChunkedUploadSessionDto> {
    return this.demoUploadService.getChunkedUploadSession(uploadId);
  }

  @Post('chunked/:uploadId/complete')
  @ApiParam({ name: 'uploadId', format: 'uuid' })
  @ApiResponse({
    status: 400,
    description:
      'Upload identifier is invalid or the upload is missing one or more chunks',
  })
  @ApiResponse({ status: 404, description: 'Chunked upload was not found' })
  @ApiResponse({
    status: 409,
    description: 'Chunked upload is not available for finalization',
  })
  @ApiResponse({ status: 410, description: 'Chunked upload has expired' })
  @ApiResponse({
    status: 422,
    description: 'Completed file size or checksum does not match',
  })
  @ApiResponse({
    status: 503,
    description: 'Chunked upload service is shutting down',
  })
  @ApiResponse({ status: 201, type: DemoChunkedUploadCompleteDto })
  completeChunkedUpload(
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
  ): Promise<DemoChunkedUploadCompleteDto> {
    return this.demoUploadService.completeChunkedUpload(uploadId);
  }

  @Delete('chunked/:uploadId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'uploadId', format: 'uuid' })
  @ApiResponse({ status: 400, description: 'Upload identifier is invalid' })
  @ApiResponse({ status: 404, description: 'Chunked upload was not found' })
  @ApiResponse({
    status: 503,
    description: 'Chunked upload service is shutting down',
  })
  @ApiResponse({ status: 204, description: 'Chunked upload was cancelled' })
  cancelChunkedUpload(
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
  ): Promise<void> {
    return this.demoUploadService.cancelChunkedUpload(uploadId);
  }

  @Post('single')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 413, description: 'Uploaded file is too large' })
  @ApiResponse({
    status: 422,
    description: 'Required uploaded file is missing or invalid',
  })
  @ApiResponse({ status: 201, type: DemoUploadFileDto })
  @UseInterceptors(FileInterceptor('file', demoUploadMulterOptions))
  uploadSingleFile(
    @UploadedFile(demoUploadRequiredFilePipe)
    file: Express.Multer.File,
  ): DemoUploadFileDto {
    return this.demoUploadService.describeSingleFile(file);
  }

  @Post('image')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'JPEG, PNG, or WebP image',
        },
      },
    },
  })
  @ApiResponse({ status: 413, description: 'Uploaded image is too large' })
  @ApiResponse({
    status: 422,
    description: 'Required image is missing or has an unsupported file type',
  })
  @ApiResponse({ status: 201, type: DemoUploadFileDto })
  @UseInterceptors(FileInterceptor('image', demoUploadMulterOptions))
  uploadImageFile(
    @UploadedFile(demoUploadRequiredImageFilePipe)
    file: Express.Multer.File,
  ): DemoUploadFileDto {
    return this.demoUploadService.describeSingleFile(file);
  }

  @Post('files')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          maxItems: DEMO_UPLOAD_MAX_FILES,
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Multipart file count or field layout is invalid',
  })
  @ApiResponse({ status: 413, description: 'An uploaded file is too large' })
  @ApiResponse({
    status: 422,
    description: 'An uploaded file name is blank or too long',
  })
  @ApiResponse({ status: 201, type: DemoUploadFilesDto })
  @UseInterceptors(
    FilesInterceptor('files', DEMO_UPLOAD_MAX_FILES, demoUploadMulterOptions),
  )
  uploadFileArray(
    @UploadedFiles() files: Express.Multer.File[],
  ): DemoUploadFilesDto {
    return this.demoUploadService.describeFiles(files);
  }

  @Post('profile-assets')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        avatar: { type: 'string', format: 'binary' },
        background: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Multipart profile asset fields are invalid',
  })
  @ApiResponse({ status: 413, description: 'An uploaded asset is too large' })
  @ApiResponse({
    status: 422,
    description: 'An uploaded asset name is blank or too long',
  })
  @ApiResponse({ status: 201, type: DemoUploadFileFieldsDto })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'avatar', maxCount: 1 },
        { name: 'background', maxCount: 1 },
      ],
      demoUploadMulterOptions,
    ),
  )
  uploadProfileAssets(
    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File[];
      background?: Express.Multer.File[];
    },
  ): DemoUploadFileFieldsDto {
    return this.demoUploadService.describeFileFields(files);
  }

  @Post('any')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      additionalProperties: {
        oneOf: [
          { type: 'string', format: 'binary' },
          {
            type: 'array',
            items: { type: 'string', format: 'binary' },
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Multipart file count or form structure is invalid',
  })
  @ApiResponse({ status: 413, description: 'An uploaded file is too large' })
  @ApiResponse({
    status: 422,
    description: 'An uploaded file name is blank or too long',
  })
  @ApiResponse({ status: 201, type: DemoUploadFilesDto })
  @UseInterceptors(AnyFilesInterceptor(demoUploadMulterOptions))
  uploadAnyFiles(
    @UploadedFiles() files: Express.Multer.File[],
  ): DemoUploadFilesDto {
    return this.demoUploadService.describeFiles(files);
  }

  @Post('form')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      maxProperties: DEMO_UPLOAD_MAX_FORM_FIELDS,
      additionalProperties: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Multipart form is malformed or contains a file',
  })
  @ApiResponse({ status: 201, type: DemoMultipartFormDto })
  @UseInterceptors(NoFilesInterceptor(demoUploadFormMulterOptions))
  handleMultipartForm(
    @Body() body: Record<string, unknown>,
  ): DemoMultipartFormDto {
    return this.demoUploadService.describeMultipartForm(body);
  }
}
