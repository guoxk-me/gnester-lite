import { Inject, Injectable, Optional } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import {
  appendFile,
  chmod,
  lstat,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type {
  DemoAssembledUploadFile,
  DemoCompletedUploadFile,
} from './demo-upload.types';
import {
  DEMO_UPLOAD_ORPHAN_RETENTION_MS,
  DEMO_UPLOAD_STORAGE_ROOT as DEMO_UPLOAD_STORAGE_ROOT_TOKEN,
} from './demo-upload.constants';

const INSTANCE_LEASE_FILE_NAME = '.instance-lease';
const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;

@Injectable()
export class DemoUploadChunkStorage {
  private readonly baseDirectory!: string;
  private readonly rootDirectory!: string;

  // AI modified: isolates temporary chunk storage from HTTP upload handling.
  constructor(
    @Optional()
    @Inject(DEMO_UPLOAD_STORAGE_ROOT_TOKEN)
    storageRoot?: string,
  ) {
    this.baseDirectory =
      storageRoot ?? join(tmpdir(), 'gnester-lite-demo-upload');
    // AI modified: isolate each process so one instance cannot delete another instance's active files.
    this.rootDirectory = join(this.baseDirectory, randomUUID());
  }

  async initialize(now = Date.now()): Promise<void> {
    await this.ensurePrivateDirectory(this.baseDirectory);
    await this.ensurePrivateDirectory(this.rootDirectory);
    await this.renewLease(now);
    // AI modified: startup removes files whose owning process stopped refreshing its lease.
    await this.clearOrphanedInstances(now);
  }

  async renewLease(now = Date.now()): Promise<void> {
    const leasePath = join(this.rootDirectory, INSTANCE_LEASE_FILE_NAME);

    await this.ensurePrivateDirectory(this.rootDirectory);
    await writeFile(leasePath, '', {
      flag: 'a',
      mode: PRIVATE_FILE_MODE,
    });
    await chmod(leasePath, PRIVATE_FILE_MODE);
    const leaseTime = new Date(now);
    await utimes(leasePath, leaseTime, leaseTime);
  }

  async clearOrphanedInstances(now = Date.now()): Promise<void> {
    await this.ensurePrivateDirectory(this.baseDirectory);
    const storageEntries = await readdir(this.baseDirectory, {
      withFileTypes: true,
    });

    await Promise.all(
      storageEntries.map(async (storageEntry) => {
        const storageEntryPath = join(this.baseDirectory, storageEntry.name);

        if (storageEntryPath === this.rootDirectory) {
          return;
        }

        const lastActivity = await this.getLastActivity(
          storageEntryPath,
          storageEntry.isDirectory(),
        );

        if (lastActivity === undefined) {
          return;
        }

        if (now - lastActivity <= DEMO_UPLOAD_ORPHAN_RETENTION_MS) {
          return;
        }

        await rm(storageEntryPath, {
          force: true,
          recursive: storageEntry.isDirectory(),
        });
      }),
    );
  }

  async saveChunk(
    uploadId: string,
    chunkIndex: number,
    chunk: Buffer,
  ): Promise<void> {
    const uploadDirectory = this.getUploadDirectory(uploadId);

    await this.ensurePrivateDirectory(uploadDirectory);
    const chunkPath = this.getChunkPath(uploadId, chunkIndex);
    await writeFile(chunkPath, chunk, { mode: PRIVATE_FILE_MODE });
    await chmod(chunkPath, PRIVATE_FILE_MODE);
  }

  async assembleUpload(
    uploadId: string,
    totalChunks: number,
  ): Promise<DemoAssembledUploadFile> {
    await this.ensurePrivateDirectory(this.rootDirectory);
    const stagedFilePath = this.getStagedFilePath(uploadId);
    const checksum = createHash('sha256');
    let size = 0;

    // AI modified: assemble privately and publish only after service-level integrity checks pass.
    await writeFile(stagedFilePath, Buffer.alloc(0), {
      mode: PRIVATE_FILE_MODE,
    });
    await chmod(stagedFilePath, PRIVATE_FILE_MODE);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const chunk = await readFile(this.getChunkPath(uploadId, chunkIndex));

      checksum.update(chunk);
      size += chunk.byteLength;
      await appendFile(stagedFilePath, chunk);
    }

    return {
      checksum: checksum.digest('hex'),
      size,
    };
  }

  async publishUpload(uploadId: string): Promise<DemoCompletedUploadFile> {
    const storedFileName = `${uploadId}.complete`;

    // AI modified: same-filesystem rename makes the completed filename visible atomically.
    await rename(
      this.getStagedFilePath(uploadId),
      this.getCompletedFilePath(uploadId),
    );

    const completedFile = await readFile(this.getCompletedFilePath(uploadId));

    return {
      checksum: createHash('sha256').update(completedFile).digest('hex'),
      size: completedFile.byteLength,
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

  async clearStagedFile(uploadId: string): Promise<void> {
    await rm(this.getStagedFilePath(uploadId), {
      force: true,
    });
  }

  async clearUpload(uploadId: string): Promise<void> {
    const cleanupResults = await Promise.allSettled([
      this.clearChunks(uploadId),
      this.clearStagedFile(uploadId),
      this.clearCompletedFile(uploadId),
    ]);
    const failedCleanup = cleanupResults.find(
      (cleanupResult) => cleanupResult.status === 'rejected',
    );

    if (failedCleanup?.status === 'rejected') {
      throw failedCleanup.reason instanceof Error
        ? failedCleanup.reason
        : new Error('Upload cleanup failed');
    }
  }

  async clearAll(): Promise<void> {
    await rm(this.rootDirectory, {
      force: true,
      recursive: true,
    });
  }

  private async getLastActivity(
    storageEntryPath: string,
    isDirectory: boolean,
  ): Promise<number | undefined> {
    if (isDirectory) {
      try {
        const leaseStats = await stat(
          join(storageEntryPath, INSTANCE_LEASE_FILE_NAME),
        );

        return leaseStats.mtimeMs;
      } catch (error) {
        if (!isMissingPathError(error)) {
          throw error;
        }
      }
    }

    try {
      return (await stat(storageEntryPath)).mtimeMs;
    } catch (error) {
      if (isMissingPathError(error)) {
        // AI modified: a peer that disappears during the sweep is already clean.
        return undefined;
      }

      throw error;
    }
  }

  private async ensurePrivateDirectory(directoryPath: string): Promise<void> {
    // AI modified: never follow a predictable pre-existing symlink into another filesystem location.
    try {
      await mkdir(directoryPath, {
        recursive: false,
        mode: PRIVATE_DIRECTORY_MODE,
      });
    } catch (error) {
      if (!isPathAlreadyExistsError(error)) {
        throw error;
      }
    }

    const directoryStats = await lstat(directoryPath);
    const currentUserId =
      typeof process.getuid === 'function' ? process.getuid() : undefined;

    if (
      directoryStats.isSymbolicLink() ||
      !directoryStats.isDirectory() ||
      (currentUserId !== undefined && directoryStats.uid !== currentUserId)
    ) {
      throw new Error(
        `Upload storage path "${directoryPath}" must be a directory owned by the current process user.`,
      );
    }

    // AI modified: temporary uploads must not inherit permissive process umasks.
    await chmod(directoryPath, PRIVATE_DIRECTORY_MODE);
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

  private getStagedFilePath(uploadId: string): string {
    return join(this.rootDirectory, `${uploadId}.assembling`);
  }
}

function isMissingPathError(
  error: unknown,
): error is NodeJS.ErrnoException & { code: 'ENOENT' } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

function isPathAlreadyExistsError(
  error: unknown,
): error is NodeJS.ErrnoException & { code: 'EEXIST' } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'EEXIST'
  );
}
