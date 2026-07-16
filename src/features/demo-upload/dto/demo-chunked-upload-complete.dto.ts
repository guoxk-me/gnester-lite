// CN: DTO 文件，定义 demo-upload 分片上传完成结果；EN: DTO file defines demo-upload chunked upload completion result.
export class DemoChunkedUploadCompleteDto {
  readonly uploadId: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly checksum: string;
  readonly isChecksumVerified: boolean;
  readonly storedFileName: string;
}
