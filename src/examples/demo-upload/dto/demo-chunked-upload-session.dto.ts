import { ApiProperty } from '@nestjs/swagger';

export class DemoChunkedUploadSessionDto {
  @ApiProperty({ format: 'uuid' })
  readonly uploadId!: string;
  readonly originalName!: string;
  readonly mimeType!: string;
  readonly fileSize!: number;
  readonly chunkSize!: number;
  readonly totalChunks!: number;
  readonly uploadedBytes!: number;
  readonly receivedChunks!: number[];
  readonly missingChunks!: number[];
  readonly isComplete!: boolean;

  @ApiProperty({ format: 'date-time' })
  readonly expiresAt!: string;
  readonly checksum?: string;
  readonly storedFileName?: string;
}
