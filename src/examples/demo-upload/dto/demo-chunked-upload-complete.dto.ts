import { ApiProperty } from '@nestjs/swagger';

export class DemoChunkedUploadCompleteDto {
  @ApiProperty({ format: 'uuid' })
  readonly uploadId!: string;
  readonly originalName!: string;
  readonly mimeType!: string;
  readonly size!: number;
  readonly checksum!: string;
  readonly isChecksumVerified!: boolean;
  readonly storedFileName!: string;
}
