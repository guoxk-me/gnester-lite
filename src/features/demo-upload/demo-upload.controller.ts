// CN: 控制器，定义 demo-upload 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-upload.
import {
  Body,
  Controller,
  Get,
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
import {
  DEMO_UPLOAD_CHUNK_FIELD_NAME,
  DEMO_UPLOAD_MAX_FILES,
} from './demo-upload.constants';
import {
  demoUploadChunkMulterOptions,
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
  // CN: 初始化 demo-upload 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-upload.
  constructor(private readonly demoUploadService: DemoUploadService) {}

  // AI modified: controller now declares upload routes while validation/storage live in dedicated boundaries.
  @Post('chunked/sessions')
  createChunkedUploadSession(
    @Body() dto: CreateDemoChunkedUploadDto,
  ): DemoChunkedUploadSessionDto {
    return this.demoUploadService.startChunkedUpload(dto);
  }

  // CN: 处理 demo-upload 的 receive chunk HTTP 请求；EN: Handles the receive chunk HTTP request for demo-upload.
  @Put('chunked/:uploadId/chunks/:chunkIndex')
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

  // CN: 处理 demo-upload 的 get chunked upload session HTTP 请求；EN: Handles the get chunked upload session HTTP request for demo-upload.
  @Get('chunked/:uploadId')
  getChunkedUploadSession(
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
  ): DemoChunkedUploadSessionDto {
    return this.demoUploadService.getChunkedUploadSession(uploadId);
  }

  // CN: 处理 demo-upload 的 complete chunked upload HTTP 请求；EN: Handles the complete chunked upload HTTP request for demo-upload.
  @Post('chunked/:uploadId/complete')
  completeChunkedUpload(
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
  ): Promise<DemoChunkedUploadCompleteDto> {
    return this.demoUploadService.completeChunkedUpload(uploadId);
  }

  // CN: 处理 demo-upload 的 upload single file HTTP 请求；EN: Handles the upload single file HTTP request for demo-upload.
  @Post('single')
  @UseInterceptors(FileInterceptor('file', demoUploadMulterOptions))
  uploadSingleFile(
    @UploadedFile(demoUploadRequiredFilePipe)
    file: Express.Multer.File,
  ): DemoUploadFileDto {
    return this.demoUploadService.describeSingleFile(file);
  }

  // CN: 处理 demo-upload 的 upload image file HTTP 请求；EN: Handles the upload image file HTTP request for demo-upload.
  @Post('image')
  @UseInterceptors(FileInterceptor('image', demoUploadMulterOptions))
  uploadImageFile(
    @UploadedFile(demoUploadRequiredImageFilePipe)
    file: Express.Multer.File,
  ): DemoUploadFileDto {
    return this.demoUploadService.describeSingleFile(file);
  }

  // CN: 处理 demo-upload 的 upload file array HTTP 请求；EN: Handles the upload file array HTTP request for demo-upload.
  @Post('files')
  @UseInterceptors(
    FilesInterceptor('files', DEMO_UPLOAD_MAX_FILES, demoUploadMulterOptions),
  )
  uploadFileArray(
    @UploadedFiles() files: Express.Multer.File[],
  ): DemoUploadFilesDto {
    return this.demoUploadService.describeFiles(files);
  }

  // CN: 处理 demo-upload 的 upload profile assets HTTP 请求；EN: Handles the upload profile assets HTTP request for demo-upload.
  @Post('profile-assets')
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

  // CN: 处理 demo-upload 的 upload any files HTTP 请求；EN: Handles the upload any files HTTP request for demo-upload.
  @Post('any')
  @UseInterceptors(AnyFilesInterceptor(demoUploadMulterOptions))
  uploadAnyFiles(
    @UploadedFiles() files: Express.Multer.File[],
  ): DemoUploadFilesDto {
    return this.demoUploadService.describeFiles(files);
  }

  // CN: 处理 demo-upload 的 handle multipart form HTTP 请求；EN: Handles the handle multipart form HTTP request for demo-upload.
  @Post('form')
  @UseInterceptors(NoFilesInterceptor())
  handleMultipartForm(
    @Body() body: Record<string, unknown>,
  ): DemoMultipartFormDto {
    return this.demoUploadService.describeMultipartForm(body);
  }
}
