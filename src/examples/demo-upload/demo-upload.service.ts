import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { CreateDemoChunkedUploadDto } from './dto/create-demo-chunked-upload.dto';
import { DemoChunkedUploadCompleteDto } from './dto/demo-chunked-upload-complete.dto';
import { DemoChunkedUploadSessionDto } from './dto/demo-chunked-upload-session.dto';
import { DemoMultipartFormDto } from './dto/demo-multipart-form.dto';
import { DemoUploadFileDto } from './dto/demo-upload-file.dto';
import { DemoUploadFileFieldsDto } from './dto/demo-upload-file-fields.dto';
import { DemoUploadFilesDto } from './dto/demo-upload-files.dto';
import {
  DEMO_UPLOAD_CLEANUP_INTERVAL_MS,
  DEMO_UPLOAD_COMPLETED_FILE_TTL_MS,
  DEMO_UPLOAD_MAX_ACTIVE_SESSIONS,
  DEMO_UPLOAD_MAX_ORIGINAL_NAME_LENGTH,
  DEMO_UPLOAD_MAX_RESERVED_BYTES,
  DEMO_UPLOAD_ASSEMBLY_STORAGE_MULTIPLIER,
  DEMO_UPLOAD_SESSION_TTL_MS,
} from './demo-upload.constants';
import { DemoUploadChunkStorage } from './demo-upload.storage';
import type { DemoChunkedUploadSessionState } from './demo-upload.types';

const UPLOAD_CAPACITY_LOCK = 'upload-capacity';

@Injectable()
export class DemoUploadService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DemoUploadService.name);
  private readonly chunkedUploadSessions = new Map<
    string,
    DemoChunkedUploadSessionState
  >();
  private readonly uploadOperations = new Map<string, Promise<unknown>>();
  private cleanupTimer?: NodeJS.Timeout;
  private maintenanceOperation?: Promise<void>;
  private isShuttingDown = false;

  // AI modified: keeps upload workflow state in the service while storage only handles files.
  constructor(private readonly chunkStorage: DemoUploadChunkStorage) {}

  async onModuleInit(): Promise<void> {
    await this.chunkStorage.initialize();
    this.cleanupTimer = setInterval(() => {
      this.startMaintenance();
    }, DEMO_UPLOAD_CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    // AI modified: close the admission gate before draining maintenance and upload work.
    this.isShuttingDown = true;

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    try {
      await this.maintenanceOperation;
      await Promise.allSettled([...this.uploadOperations.values()]);
      // AI modified: shutdown removes only this process's upload artifacts and propagates cleanup failure.
      await this.chunkStorage.clearAll();
    } finally {
      this.chunkedUploadSessions.clear();
      this.uploadOperations.clear();
    }
  }

  describeSingleFile(file: Express.Multer.File): DemoUploadFileDto {
    return this.toFileDto(file);
  }

  describeFiles(files: Express.Multer.File[]): DemoUploadFilesDto {
    const uploadedFiles = files.map((file) => this.toFileDto(file));

    return {
      count: uploadedFiles.length,
      files: uploadedFiles,
    };
  }

  describeFileFields(
    files: Record<string, Express.Multer.File[] | undefined>,
  ): DemoUploadFileFieldsDto {
    return {
      fields: Object.fromEntries(
        Object.entries(files).map(([fieldName, fieldFiles = []]) => [
          fieldName,
          fieldFiles.map((file) => this.toFileDto(file)),
        ]),
      ),
    };
  }

  describeMultipartForm(body: Record<string, unknown>): DemoMultipartFormDto {
    return {
      fields: body,
    };
  }

  async startChunkedUpload(
    dto: CreateDemoChunkedUploadDto,
  ): Promise<DemoChunkedUploadSessionDto> {
    return this.withUploadOperation(UPLOAD_CAPACITY_LOCK, async () => {
      await this.removeExpiredSessions();
      const expectedTotalChunks = Math.ceil(dto.fileSize / dto.chunkSize);

      if (dto.totalChunks !== expectedTotalChunks) {
        throw new BadRequestException(
          `totalChunks must be ${expectedTotalChunks} for the provided fileSize and chunkSize.`,
        );
      }

      const reservedBytes = [...this.chunkedUploadSessions.values()].reduce(
        (totalBytes, session) =>
          totalBytes +
          session.fileSize * DEMO_UPLOAD_ASSEMBLY_STORAGE_MULTIPLIER,
        0,
      );
      const requestedReservation =
        dto.fileSize * DEMO_UPLOAD_ASSEMBLY_STORAGE_MULTIPLIER;

      if (
        this.chunkedUploadSessions.size >= DEMO_UPLOAD_MAX_ACTIVE_SESSIONS ||
        reservedBytes + requestedReservation > DEMO_UPLOAD_MAX_RESERVED_BYTES
      ) {
        throw new ServiceUnavailableException(
          'Chunked upload capacity is currently exhausted.',
        );
      }

      const now = Date.now();
      const uploadId = randomUUID();
      const session: DemoChunkedUploadSessionState = {
        uploadId,
        originalName: dto.originalName,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        chunkSize: dto.chunkSize,
        totalChunks: dto.totalChunks,
        checksum: dto.checksum,
        receivedChunkBytes: new Map<number, number>(),
        createdAt: now,
        expiresAt: now + DEMO_UPLOAD_SESSION_TTL_MS,
        status: 'active',
      };

      // AI modified: reserve chunk plus assembly bytes before accepting data so peak storage stays bounded.
      this.chunkedUploadSessions.set(uploadId, session);

      return this.describeChunkedUploadSession(session);
    });
  }

  async receiveChunk(
    uploadId: string,
    chunkIndex: number,
    file: Express.Multer.File,
  ): Promise<DemoChunkedUploadSessionDto> {
    return this.withUploadOperation(uploadId, async () => {
      this.assertOriginalName(file);
      const session = await this.getCurrentSession(uploadId);
      this.assertActiveSession(session);
      this.assertChunkIndex(session, chunkIndex);

      const expectedChunkSize = this.getExpectedChunkSize(session, chunkIndex);

      if (file.size !== expectedChunkSize) {
        throw new BadRequestException(
          `Chunk ${chunkIndex} must be ${expectedChunkSize} bytes.`,
        );
      }

      await this.chunkStorage.saveChunk(uploadId, chunkIndex, file.buffer);
      session.receivedChunkBytes.set(chunkIndex, file.size);

      return this.describeChunkedUploadSession(session);
    });
  }

  async getChunkedUploadSession(
    uploadId: string,
  ): Promise<DemoChunkedUploadSessionDto> {
    return this.withUploadOperation(uploadId, async () => {
      const session = await this.getCurrentSession(uploadId);

      return this.describeChunkedUploadSession(session);
    });
  }

  async completeChunkedUpload(
    uploadId: string,
  ): Promise<DemoChunkedUploadCompleteDto> {
    return this.withUploadOperation(uploadId, async () => {
      const session = await this.getCurrentSession(uploadId);
      this.assertActiveSession(session);

      const missingChunks = this.getMissingChunks(session);

      if (missingChunks.length > 0) {
        throw new BadRequestException(
          `Upload is missing chunks: ${missingChunks.join(', ')}.`,
        );
      }

      session.status = 'finalizing';

      try {
        const assembledFile = await this.chunkStorage.assembleUpload(
          uploadId,
          session.totalChunks,
        );

        if (assembledFile.size !== session.fileSize) {
          throw new UnprocessableEntityException(
            'Completed file size does not match the declared upload size.',
          );
        }

        const isChecksumVerified =
          typeof session.checksum === 'string' &&
          session.checksum === assembledFile.checksum;

        if (session.checksum && !isChecksumVerified) {
          throw new UnprocessableEntityException(
            'Completed file checksum does not match the declared checksum.',
          );
        }

        const completedFile = await this.chunkStorage.publishUpload(uploadId);
        session.status = 'complete';
        session.completedChecksum = completedFile.checksum;
        session.storedFileName = completedFile.storedFileName;
        session.expiresAt = Date.now() + DEMO_UPLOAD_COMPLETED_FILE_TTL_MS;

        try {
          await this.chunkStorage.clearChunks(uploadId);
        } catch (error) {
          this.logger.warn(
            `Completed upload chunk cleanup will retry at expiry: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }

        return {
          uploadId: session.uploadId,
          originalName: session.originalName,
          mimeType: session.mimeType,
          size: completedFile.size,
          checksum: completedFile.checksum,
          isChecksumVerified,
          storedFileName: completedFile.storedFileName,
        };
      } catch (error) {
        session.status = 'active';
        const cleanupResults = await Promise.allSettled([
          this.chunkStorage.clearStagedFile(uploadId),
          this.chunkStorage.clearCompletedFile(uploadId),
        ]);
        const failedCleanup = cleanupResults.find(
          (cleanupResult) => cleanupResult.status === 'rejected',
        );

        if (failedCleanup?.status === 'rejected') {
          this.logger.warn(
            `Failed to clear staged upload: ${
              failedCleanup.reason instanceof Error
                ? failedCleanup.reason.message
                : String(failedCleanup.reason)
            }`,
          );
        }
        throw error;
      }
    });
  }

  async cancelChunkedUpload(uploadId: string): Promise<void> {
    await this.withUploadOperation(uploadId, async () => {
      const session = this.getChunkedUploadSessionState(uploadId);
      session.status = 'cancelling';
      await this.chunkStorage.clearUpload(uploadId);
      this.chunkedUploadSessions.delete(uploadId);
    });
  }

  private toFileDto(file: Express.Multer.File): DemoUploadFileDto {
    this.assertOriginalName(file);

    return {
      fieldName: file.fieldname,
      originalName: file.originalname,
      encoding: file.encoding,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  private assertOriginalName(file: Express.Multer.File): void {
    if (
      file.originalname.length > DEMO_UPLOAD_MAX_ORIGINAL_NAME_LENGTH ||
      !/\S/.test(file.originalname)
    ) {
      // AI modified: reject meaningless or oversized client filenames before echoing metadata or writing chunks.
      throw new UnprocessableEntityException(
        `Uploaded file name must contain non-whitespace text and be at most ${DEMO_UPLOAD_MAX_ORIGINAL_NAME_LENGTH} characters.`,
      );
    }
  }

  private getChunkedUploadSessionState(
    uploadId: string,
  ): DemoChunkedUploadSessionState {
    const session = this.chunkedUploadSessions.get(uploadId);

    if (!session) {
      throw new NotFoundException(
        `Chunked upload "${uploadId}" was not found.`,
      );
    }

    return session;
  }

  private async getCurrentSession(
    uploadId: string,
  ): Promise<DemoChunkedUploadSessionState> {
    const session = this.getChunkedUploadSessionState(uploadId);

    if (session.expiresAt <= Date.now()) {
      session.status = 'cancelling';
      await this.chunkStorage.clearUpload(uploadId);
      this.chunkedUploadSessions.delete(uploadId);
      throw new GoneException(`Chunked upload "${uploadId}" has expired.`);
    }

    return session;
  }

  private assertActiveSession(session: DemoChunkedUploadSessionState): void {
    if (session.status !== 'active') {
      throw new ConflictException(
        session.status === 'complete'
          ? 'Chunked upload is already complete.'
          : 'Chunked upload is not accepting changes.',
      );
    }
  }

  private async cleanupExpiredSessions(): Promise<void> {
    await this.withUploadOperation(
      UPLOAD_CAPACITY_LOCK,
      () => this.removeExpiredSessions(),
      true,
    );
  }

  private async runMaintenance(): Promise<void> {
    await this.chunkStorage.renewLease();
    await this.chunkStorage.clearOrphanedInstances();
    await this.cleanupExpiredSessions();
  }

  private startMaintenance(): void {
    if (this.isShuttingDown || this.maintenanceOperation) {
      return;
    }

    // AI modified: track one maintenance run so shutdown can drain it before deleting storage.
    const maintenanceOperation = this.runMaintenance()
      .catch((error: unknown) => {
        this.logger.error(
          'Chunked upload cleanup failed',
          error instanceof Error ? error.stack : String(error),
        );
      })
      .finally(() => {
        if (this.maintenanceOperation === maintenanceOperation) {
          this.maintenanceOperation = undefined;
        }
      });
    this.maintenanceOperation = maintenanceOperation;
  }

  private async removeExpiredSessions(): Promise<void> {
    const now = Date.now();
    const expiredUploadIds = [...this.chunkedUploadSessions.values()]
      .filter((session) => session.expiresAt <= now)
      .map((session) => session.uploadId);

    await Promise.all(
      expiredUploadIds.map((uploadId) =>
        this.withUploadOperation(
          uploadId,
          async () => {
            const session = this.chunkedUploadSessions.get(uploadId);

            if (!session || session.expiresAt > Date.now()) {
              return;
            }

            session.status = 'cancelling';
            await this.chunkStorage.clearUpload(uploadId);
            this.chunkedUploadSessions.delete(uploadId);
          },
          true,
        ),
      ),
    );
  }

  private async withUploadOperation<OperationOutcome>(
    lockKey: string,
    operation: () => Promise<OperationOutcome>,
    canRunDuringShutdown = false,
  ): Promise<OperationOutcome> {
    if (this.isShuttingDown && !canRunDuringShutdown) {
      throw new ServiceUnavailableException(
        'Chunked upload service is shutting down.',
      );
    }

    const previousOperation =
      this.uploadOperations.get(lockKey) ?? Promise.resolve();
    const currentOperation = previousOperation
      .catch(() => undefined)
      .then(operation);
    this.uploadOperations.set(lockKey, currentOperation);

    try {
      // AI modified: per-upload sequencing prevents chunk/finalize/cancel filesystem races.
      return await currentOperation;
    } finally {
      if (this.uploadOperations.get(lockKey) === currentOperation) {
        this.uploadOperations.delete(lockKey);
      }
    }
  }

  private assertChunkIndex(
    session: DemoChunkedUploadSessionState,
    chunkIndex: number,
  ): void {
    if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
      throw new BadRequestException(
        `chunkIndex must be between 0 and ${session.totalChunks - 1}.`,
      );
    }
  }

  private getExpectedChunkSize(
    session: DemoChunkedUploadSessionState,
    chunkIndex: number,
  ): number {
    const remainingBytes = session.fileSize - session.chunkSize * chunkIndex;

    return Math.min(session.chunkSize, remainingBytes);
  }

  private getReceivedChunks(session: DemoChunkedUploadSessionState): number[] {
    return [...session.receivedChunkBytes.keys()].sort((left, right) => {
      return left - right;
    });
  }

  private getMissingChunks(session: DemoChunkedUploadSessionState): number[] {
    const missingChunks: number[] = [];

    for (
      let chunkIndex = 0;
      chunkIndex < session.totalChunks;
      chunkIndex += 1
    ) {
      if (!session.receivedChunkBytes.has(chunkIndex)) {
        missingChunks.push(chunkIndex);
      }
    }

    return missingChunks;
  }

  private getUploadedBytes(session: DemoChunkedUploadSessionState): number {
    return [...session.receivedChunkBytes.values()].reduce(
      (totalBytes, chunkBytes) => totalBytes + chunkBytes,
      0,
    );
  }

  private describeChunkedUploadSession(
    session: DemoChunkedUploadSessionState,
  ): DemoChunkedUploadSessionDto {
    return {
      uploadId: session.uploadId,
      originalName: session.originalName,
      mimeType: session.mimeType,
      fileSize: session.fileSize,
      chunkSize: session.chunkSize,
      totalChunks: session.totalChunks,
      uploadedBytes: this.getUploadedBytes(session),
      receivedChunks: this.getReceivedChunks(session),
      missingChunks: this.getMissingChunks(session),
      isComplete: session.status === 'complete',
      expiresAt: new Date(session.expiresAt).toISOString(),
      checksum: session.completedChecksum ?? session.checksum,
      storedFileName: session.storedFileName,
    };
  }
}
