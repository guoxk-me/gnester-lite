export interface DemoChunkedUploadSessionState {
  readonly uploadId: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly fileSize: number;
  readonly chunkSize: number;
  readonly totalChunks: number;
  readonly checksum?: string;
  readonly receivedChunkBytes: Map<number, number>;
  readonly createdAt: number;
  expiresAt: number;
  status: 'active' | 'finalizing' | 'complete' | 'cancelling';
  completedChecksum?: string;
  storedFileName?: string;
}

export interface DemoAssembledUploadFile {
  readonly checksum: string;
  readonly size: number;
}

export interface DemoCompletedUploadFile {
  readonly checksum: string;
  readonly size: number;
  readonly storedFileName: string;
}
