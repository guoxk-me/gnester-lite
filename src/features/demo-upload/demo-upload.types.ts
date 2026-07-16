// CN: 类型文件，描述 demo-upload 的内部上传会话；EN: Type file describes demo-upload internal upload sessions.
export interface DemoChunkedUploadSessionState {
  readonly uploadId: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly fileSize: number;
  readonly chunkSize: number;
  readonly totalChunks: number;
  readonly checksum?: string;
  readonly receivedChunkBytes: Map<number, number>;
  isComplete: boolean;
  completedChecksum?: string;
  storedFileName?: string;
}

export interface DemoCompletedUploadFile {
  readonly checksum: string;
  readonly size: number;
  readonly storedFileName: string;
}
