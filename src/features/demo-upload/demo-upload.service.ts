// CN: 服务，承载 demo-upload 的业务逻辑；EN: Service holds business logic for demo-upload.
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
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
import { DemoUploadChunkStorage } from './demo-upload.storage';
import type { DemoChunkedUploadSessionState } from './demo-upload.types';

@Injectable()
export class DemoUploadService {
  private readonly chunkedUploadSessions = new Map<
    string,
    DemoChunkedUploadSessionState
  >();

  // AI modified: keeps upload workflow state in the service while storage only handles files.
  constructor(private readonly chunkStorage: DemoUploadChunkStorage) {}

  // CN: 执行 demo-upload 的 describe single file 业务逻辑；EN: Runs the describe single file business logic for demo-upload.
  describeSingleFile(file: Express.Multer.File): DemoUploadFileDto {
    return this.toFileDto(file);
  }

  // CN: 执行 demo-upload 的 describe files 业务逻辑；EN: Runs the describe files business logic for demo-upload.
  describeFiles(files: Express.Multer.File[]): DemoUploadFilesDto {
    const uploadedFiles = files.map((file) => this.toFileDto(file));

    return {
      count: uploadedFiles.length,
      files: uploadedFiles,
    };
  }

  // CN: 执行 demo-upload 的 describe file fields 业务逻辑；EN: Runs the describe file fields business logic for demo-upload.
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

  // CN: 执行 demo-upload 的 describe multipart form 业务逻辑；EN: Runs the describe multipart form business logic for demo-upload.
  describeMultipartForm(body: Record<string, unknown>): DemoMultipartFormDto {
    return {
      fields: body,
    };
  }

  startChunkedUpload(
    dto: CreateDemoChunkedUploadDto,
  ): DemoChunkedUploadSessionDto {
    const expectedTotalChunks = Math.ceil(dto.fileSize / dto.chunkSize);

    if (dto.totalChunks !== expectedTotalChunks) {
      throw new BadRequestException(
        `totalChunks must be ${expectedTotalChunks} for the provided fileSize and chunkSize.`,
      );
    }

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
      isComplete: false,
    };

    this.chunkedUploadSessions.set(uploadId, session);

    return this.describeChunkedUploadSession(session);
  }

  async receiveChunk(
    uploadId: string,
    chunkIndex: number,
    file: Express.Multer.File,
  ): Promise<DemoChunkedUploadSessionDto> {
    const session = this.getChunkedUploadSessionState(uploadId);

    if (session.isComplete) {
      throw new ConflictException('Chunked upload is already complete.');
    }

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
  }

  getChunkedUploadSession(uploadId: string): DemoChunkedUploadSessionDto {
    return this.describeChunkedUploadSession(
      this.getChunkedUploadSessionState(uploadId),
    );
  }

  async completeChunkedUpload(
    uploadId: string,
  ): Promise<DemoChunkedUploadCompleteDto> {
    const session = this.getChunkedUploadSessionState(uploadId);

    if (session.isComplete) {
      throw new ConflictException('Chunked upload is already complete.');
    }

    const missingChunks = this.getMissingChunks(session);

    if (missingChunks.length > 0) {
      throw new BadRequestException(
        `Upload is missing chunks: ${missingChunks.join(', ')}.`,
      );
    }

    const completedFile = await this.chunkStorage.assembleUpload(
      uploadId,
      session.totalChunks,
    );

    if (completedFile.size !== session.fileSize) {
      await this.chunkStorage.clearCompletedFile(uploadId);
      throw new UnprocessableEntityException(
        'Completed file size does not match the declared upload size.',
      );
    }

    const isChecksumVerified =
      typeof session.checksum === 'string' &&
      session.checksum === completedFile.checksum;

    if (session.checksum && !isChecksumVerified) {
      await this.chunkStorage.clearCompletedFile(uploadId);
      throw new UnprocessableEntityException(
        'Completed file checksum does not match the declared checksum.',
      );
    }

    session.isComplete = true;
    session.completedChecksum = completedFile.checksum;
    session.storedFileName = completedFile.storedFileName;
    await this.chunkStorage.clearChunks(uploadId);

    return {
      uploadId: session.uploadId,
      originalName: session.originalName,
      mimeType: session.mimeType,
      size: completedFile.size,
      checksum: completedFile.checksum,
      isChecksumVerified,
      storedFileName: completedFile.storedFileName,
    };
  }

  // CN: 执行 demo-upload 的 to file dto 业务逻辑；EN: Runs the to file dto business logic for demo-upload.
  private toFileDto(file: Express.Multer.File): DemoUploadFileDto {
    return {
      fieldName: file.fieldname,
      originalName: file.originalname,
      encoding: file.encoding,
      mimeType: file.mimetype,
      size: file.size,
    };
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
      isComplete: session.isComplete,
      checksum: session.completedChecksum ?? session.checksum,
      storedFileName: session.storedFileName,
    };
  }
}
