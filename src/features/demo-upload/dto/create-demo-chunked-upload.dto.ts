// CN: DTO 文件，定义 demo-upload 分片上传会话输入；EN: DTO file defines demo-upload chunked upload session input.
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import {
  DEMO_UPLOAD_MAX_CHUNKED_FILE_SIZE_BYTES,
  DEMO_UPLOAD_MAX_CHUNKS,
  DEMO_UPLOAD_MAX_CHUNK_SIZE_BYTES,
} from '../demo-upload.constants';

export class CreateDemoChunkedUploadDto {
  @IsString()
  @MaxLength(120)
  readonly originalName: string;

  @IsString()
  @MaxLength(120)
  @Matches(/^[A-Za-z0-9.+-]+\/[A-Za-z0-9.+-]+$/)
  readonly mimeType: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DEMO_UPLOAD_MAX_CHUNKED_FILE_SIZE_BYTES)
  readonly fileSize: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DEMO_UPLOAD_MAX_CHUNK_SIZE_BYTES)
  readonly chunkSize: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DEMO_UPLOAD_MAX_CHUNKS)
  readonly totalChunks: number;

  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i)
  readonly checksum?: string;
}
