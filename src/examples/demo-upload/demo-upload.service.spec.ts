import {
  ConflictException,
  GoneException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';

import {
  DEMO_UPLOAD_MAX_CHUNKED_FILE_SIZE_BYTES,
  DEMO_UPLOAD_MAX_ORIGINAL_NAME_LENGTH,
  DEMO_UPLOAD_SESSION_TTL_MS,
} from './demo-upload.constants';
import { DemoUploadService } from './demo-upload.service';
import { DemoUploadChunkStorage } from './demo-upload.storage';

describe('DemoUploadService', () => {
  const chunkStorage: jest.Mocked<
    Pick<
      DemoUploadChunkStorage,
      | 'assembleUpload'
      | 'clearAll'
      | 'clearChunks'
      | 'clearCompletedFile'
      | 'clearOrphanedInstances'
      | 'clearStagedFile'
      | 'clearUpload'
      | 'initialize'
      | 'publishUpload'
      | 'renewLease'
      | 'saveChunk'
    >
  > = {
    assembleUpload: jest.fn(),
    clearAll: jest.fn(),
    clearChunks: jest.fn(),
    clearCompletedFile: jest.fn(),
    clearOrphanedInstances: jest.fn(),
    clearStagedFile: jest.fn(),
    clearUpload: jest.fn(),
    initialize: jest.fn(),
    publishUpload: jest.fn(),
    renewLease: jest.fn(),
    saveChunk: jest.fn(),
  };
  let service: DemoUploadService;

  beforeEach(() => {
    jest.clearAllMocks();
    chunkStorage.assembleUpload.mockResolvedValue({
      checksum: createHash('sha256').update('abc').digest('hex'),
      size: 3,
    });
    chunkStorage.publishUpload.mockImplementation((uploadId) =>
      Promise.resolve({
        checksum: createHash('sha256').update('abc').digest('hex'),
        size: 3,
        storedFileName: `${uploadId}.complete`,
      }),
    );
    service = new DemoUploadService(
      chunkStorage as unknown as DemoUploadChunkStorage,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('serializes duplicate finalization and publishes only once', async () => {
    const session = await service.startChunkedUpload({
      originalName: 'note.txt',
      mimeType: 'text/plain',
      fileSize: 3,
      chunkSize: 3,
      totalChunks: 1,
    });
    await service.receiveChunk(
      session.uploadId,
      0,
      createChunkFile(Buffer.from('abc')),
    );

    const completionResults = await Promise.allSettled([
      service.completeChunkedUpload(session.uploadId),
      service.completeChunkedUpload(session.uploadId),
    ]);

    expect(
      completionResults.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejectedResult = completionResults.find(
      (result) => result.status === 'rejected',
    );
    expect(rejectedResult?.status).toBe('rejected');
    if (rejectedResult?.status === 'rejected') {
      expect(rejectedResult.reason).toBeInstanceOf(ConflictException);
    }
    expect(chunkStorage.assembleUpload).toHaveBeenCalledTimes(1);
    expect(chunkStorage.publishUpload).toHaveBeenCalledTimes(1);
  });

  it('rejects chunks queued behind an in-progress finalization', async () => {
    let finishAssembly!: (value: { checksum: string; size: number }) => void;
    const pendingAssembly = new Promise<{
      checksum: string;
      size: number;
    }>((resolve) => {
      finishAssembly = resolve;
    });
    chunkStorage.assembleUpload.mockReturnValueOnce(pendingAssembly);
    const session = await service.startChunkedUpload({
      originalName: 'note.txt',
      mimeType: 'text/plain',
      fileSize: 3,
      chunkSize: 3,
      totalChunks: 1,
    });
    await service.receiveChunk(
      session.uploadId,
      0,
      createChunkFile(Buffer.from('abc')),
    );

    const completion = service.completeChunkedUpload(session.uploadId);
    const lateChunk = service.receiveChunk(
      session.uploadId,
      0,
      createChunkFile(Buffer.from('abc')),
    );
    finishAssembly({
      checksum: createHash('sha256').update('abc').digest('hex'),
      size: 3,
    });

    await expect(completion).resolves.toEqual(
      expect.objectContaining({ uploadId: session.uploadId }),
    );
    await expect(lateChunk).rejects.toBeInstanceOf(ConflictException);
    expect(chunkStorage.saveChunk).toHaveBeenCalledTimes(1);
  });

  it('cancels a session and removes every owned artifact', async () => {
    const session = await service.startChunkedUpload({
      originalName: 'note.txt',
      mimeType: 'text/plain',
      fileSize: 3,
      chunkSize: 3,
      totalChunks: 1,
    });

    await service.cancelChunkedUpload(session.uploadId);

    expect(chunkStorage.clearUpload).toHaveBeenCalledWith(session.uploadId);
    await expect(
      service.getChunkedUploadSession(session.uploadId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('expires abandoned sessions and clears their artifacts', async () => {
    const initialTime = Date.parse('2026-07-28T00:00:00.000Z');
    const now = jest.spyOn(Date, 'now').mockReturnValue(initialTime);
    const session = await service.startChunkedUpload({
      originalName: 'note.txt',
      mimeType: 'text/plain',
      fileSize: 3,
      chunkSize: 3,
      totalChunks: 1,
    });
    now.mockReturnValue(initialTime + DEMO_UPLOAD_SESSION_TTL_MS + 1);

    await expect(
      service.getChunkedUploadSession(session.uploadId),
    ).rejects.toBeInstanceOf(GoneException);
    expect(chunkStorage.clearUpload).toHaveBeenCalledWith(session.uploadId);
  });

  it('rejects reservations beyond the global upload byte quota', async () => {
    for (let index = 0; index < 2; index += 1) {
      await service.startChunkedUpload({
        originalName: `large-${index}.bin`,
        mimeType: 'application/octet-stream',
        fileSize: DEMO_UPLOAD_MAX_CHUNKED_FILE_SIZE_BYTES,
        chunkSize: 1024 * 1024,
        totalChunks: 20,
      });
    }

    await expect(
      service.startChunkedUpload({
        originalName: 'over-capacity.bin',
        mimeType: 'application/octet-stream',
        fileSize: DEMO_UPLOAD_MAX_CHUNKED_FILE_SIZE_BYTES,
        chunkSize: 1024 * 1024,
        totalChunks: 20,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('initializes process storage and clears it during shutdown', async () => {
    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(chunkStorage.initialize).toHaveBeenCalledTimes(1);
    expect(chunkStorage.clearAll).toHaveBeenCalledTimes(1);
  });

  it('sweeps newly stale process directories during periodic maintenance', async () => {
    jest.useFakeTimers();

    try {
      await service.onModuleInit();
      await jest.advanceTimersByTimeAsync(60_000);

      expect(chunkStorage.renewLease).toHaveBeenCalledTimes(1);
      expect(chunkStorage.clearOrphanedInstances).toHaveBeenCalledTimes(1);
      await service.onModuleDestroy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('waits for in-flight maintenance before deleting process storage', async () => {
    jest.useFakeTimers();
    let finishLeaseRenewal!: () => void;
    const leaseRenewal = new Promise<void>((resolve) => {
      finishLeaseRenewal = resolve;
    });
    chunkStorage.renewLease.mockReturnValueOnce(leaseRenewal);

    try {
      await service.onModuleInit();
      await jest.advanceTimersByTimeAsync(60_000);

      const shutdown = service.onModuleDestroy();
      await Promise.resolve();
      expect(chunkStorage.clearAll).not.toHaveBeenCalled();

      finishLeaseRenewal();
      await shutdown;

      expect(chunkStorage.clearOrphanedInstances).toHaveBeenCalledTimes(1);
      expect(chunkStorage.clearAll).toHaveBeenCalledTimes(1);
      expect(
        chunkStorage.clearOrphanedInstances.mock.invocationCallOrder[0],
      ).toBeLessThan(chunkStorage.clearAll.mock.invocationCallOrder[0]);
      await jest.advanceTimersByTimeAsync(60_000);
      expect(chunkStorage.renewLease).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects new upload work after shutdown starts', async () => {
    await service.onModuleDestroy();

    await expect(
      service.startChunkedUpload({
        originalName: 'late.bin',
        mimeType: 'application/octet-stream',
        fileSize: 3,
        chunkSize: 3,
        totalChunks: 1,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(chunkStorage.saveChunk).not.toHaveBeenCalled();
  });

  it.each([
    ['whitespace-only', '   '],
    ['overlong', 'x'.repeat(DEMO_UPLOAD_MAX_ORIGINAL_NAME_LENGTH + 1)],
  ])('rejects a %s uploaded filename', (_scenario, originalName) => {
    const file = createChunkFile(Buffer.from('abc'), originalName);

    expect(() => service.describeSingleFile(file)).toThrow(
      UnprocessableEntityException,
    );
  });

  it('applies uploaded filename validation to arrays and named fields', () => {
    const whitespaceFile = createChunkFile(Buffer.from('abc'), '   ');
    const overlongFile = createChunkFile(
      Buffer.from('abc'),
      'x'.repeat(DEMO_UPLOAD_MAX_ORIGINAL_NAME_LENGTH + 1),
    );

    expect(() => service.describeFiles([whitespaceFile])).toThrow(
      UnprocessableEntityException,
    );
    expect(() =>
      service.describeFileFields({ avatar: [overlongFile] }),
    ).toThrow(UnprocessableEntityException);
  });

  it('rejects an invalid chunk filename before touching storage', async () => {
    await expect(
      service.receiveChunk(
        'missing-upload',
        0,
        createChunkFile(Buffer.from('abc'), '   '),
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(chunkStorage.saveChunk).not.toHaveBeenCalled();
  });

  it('clears staged and completed artifacts after finalization failure', async () => {
    const error = new Error('assemble failed');
    chunkStorage.assembleUpload.mockRejectedValueOnce(error);
    const session = await service.startChunkedUpload({
      originalName: 'note.txt',
      mimeType: 'text/plain',
      fileSize: 3,
      chunkSize: 3,
      totalChunks: 1,
    });
    await service.receiveChunk(
      session.uploadId,
      0,
      createChunkFile(Buffer.from('abc')),
    );

    await expect(
      service.completeChunkedUpload(session.uploadId),
    ).rejects.toThrow(error);
    expect(chunkStorage.clearStagedFile).toHaveBeenCalledWith(session.uploadId);
    expect(chunkStorage.clearCompletedFile).toHaveBeenCalledWith(
      session.uploadId,
    );
  });
});

function createChunkFile(
  buffer: Buffer,
  originalName = 'chunk.bin',
): Express.Multer.File {
  return {
    fieldname: 'chunk',
    originalname: originalName,
    encoding: '7bit',
    mimetype: 'application/octet-stream',
    size: buffer.byteLength,
    destination: '',
    filename: '',
    path: '',
    buffer,
    stream: undefined as never,
  };
}
