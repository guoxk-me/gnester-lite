// CN: 存储文件，封装 demo-upload 的临时分片文件策略；EN: Storage file encapsulates demo-upload temporary chunk file strategy.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DemoCompletedUploadFile } from './demo-upload.types';
import { DEMO_UPLOAD_STORAGE_ROOT as DEMO_UPLOAD_STORAGE_ROOT_TOKEN } from './demo-upload.constants';

@Injectable()
export class DemoUploadChunkStorage {
  private readonly rootDirectory: string;

  // AI modified: isolates temporary chunk storage from HTTP upload handling.
  constructor(
    @Optional()
    @Inject(DEMO_UPLOAD_STORAGE_ROOT_TOKEN)
    rootDirectory?: string,
  ) {
    this.rootDirectory =
      rootDirectory ?? join(tmpdir(), 'gnester-lite-demo-upload');
  }

  async saveChunk(
    uploadId: string,
    chunkIndex: number,
    chunk: Buffer,
  ): Promise<void> {
    const uploadDirectory = this.getUploadDirectory(uploadId);

    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(this.getChunkPath(uploadId, chunkIndex), chunk);
  }

  async assembleUpload(
    uploadId: string,
    totalChunks: number,
  ): Promise<DemoCompletedUploadFile> {
    await mkdir(this.rootDirectory, { recursive: true });
    const storedFileName = `${uploadId}.complete`;
    const completedFilePath = this.getCompletedFilePath(uploadId);
    const checksum = createHash('sha256');
    let size = 0;

    await writeFile(completedFilePath, Buffer.alloc(0));

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const chunk = await readFile(this.getChunkPath(uploadId, chunkIndex));

      checksum.update(chunk);
      size += chunk.byteLength;
      await appendFile(completedFilePath, chunk);
    }

    return {
      checksum: checksum.digest('hex'),
      size,
      storedFileName,
    };
  }

  async clearChunks(uploadId: string): Promise<void> {
    await rm(this.getUploadDirectory(uploadId), {
      force: true,
      recursive: true,
    });
  }

  async clearCompletedFile(uploadId: string): Promise<void> {
    await rm(this.getCompletedFilePath(uploadId), {
      force: true,
    });
  }

  private getUploadDirectory(uploadId: string): string {
    return join(this.rootDirectory, uploadId);
  }

  private getChunkPath(uploadId: string, chunkIndex: number): string {
    const chunkFileName = `${String(chunkIndex).padStart(6, '0')}.chunk`;

    return join(this.getUploadDirectory(uploadId), chunkFileName);
  }

  private getCompletedFilePath(uploadId: string): string {
    return join(this.rootDirectory, `${uploadId}.complete`);
  }
}
