import { ApiProperty } from '@nestjs/swagger';
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
  DEMO_UPLOAD_MAX_ORIGINAL_NAME_LENGTH,
} from '../demo-upload.constants';

export class CreateDemoChunkedUploadDto {
  @ApiProperty({
    minLength: 1,
    maxLength: DEMO_UPLOAD_MAX_ORIGINAL_NAME_LENGTH,
    pattern: '\\S',
  })
  @IsString()
  @Matches(/\S/)
  @MaxLength(DEMO_UPLOAD_MAX_ORIGINAL_NAME_LENGTH)
  readonly originalName!: string;

  @ApiProperty({
    maxLength: 120,
    pattern: '^[A-Za-z0-9.+-]+/[A-Za-z0-9.+-]+$',
  })
  @IsString()
  @MaxLength(120)
  @Matches(/^[A-Za-z0-9.+-]+\/[A-Za-z0-9.+-]+$/)
  readonly mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DEMO_UPLOAD_MAX_CHUNKED_FILE_SIZE_BYTES)
  // AI modified: imported validator constants are not inferred by the Swagger CLI plugin.
  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: DEMO_UPLOAD_MAX_CHUNKED_FILE_SIZE_BYTES,
  })
  readonly fileSize!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DEMO_UPLOAD_MAX_CHUNK_SIZE_BYTES)
  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: DEMO_UPLOAD_MAX_CHUNK_SIZE_BYTES,
  })
  readonly chunkSize!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DEMO_UPLOAD_MAX_CHUNKS)
  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: DEMO_UPLOAD_MAX_CHUNKS,
  })
  readonly totalChunks!: number;

  @IsOptional()
  @IsString()
  // AI modified: storage emits lowercase SHA-256, so the accepted contract is canonical lowercase too.
  @Matches(/^[a-f0-9]{64}$/)
  @ApiProperty({
    required: false,
    minLength: 64,
    maxLength: 64,
    pattern: '^[a-f0-9]{64}$',
  })
  readonly checksum?: string;
}
