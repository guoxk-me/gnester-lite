// CN: DTO 文件，定义 demo-upload 分片上传会话状态；EN: DTO file defines demo-upload chunked upload session state.
export class DemoChunkedUploadSessionDto {
  readonly uploadId: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly fileSize: number;
  readonly chunkSize: number;
  readonly totalChunks: number;
  readonly uploadedBytes: number;
  readonly receivedChunks: number[];
  readonly missingChunks: number[];
  readonly isComplete: boolean;
  readonly checksum?: string;
  readonly storedFileName?: string;
}
