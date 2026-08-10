import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { createHash } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  DEMO_UPLOAD_CHUNK_FIELD_NAME,
  DEMO_UPLOAD_MAX_FILES,
  DEMO_UPLOAD_MAX_FILE_SIZE_BYTES,
  DEMO_UPLOAD_MAX_FORM_FIELDS,
  DEMO_UPLOAD_MAX_FORM_FIELD_SIZE_BYTES,
  DEMO_UPLOAD_MAX_ORIGINAL_NAME_LENGTH,
} from './demo-upload.constants';
import { DemoUploadModule } from './demo-upload.module';
import { CreateDemoChunkedUploadDto } from './dto/create-demo-chunked-upload.dto';
import { DemoChunkedUploadCompleteDto } from './dto/demo-chunked-upload-complete.dto';
import { DemoChunkedUploadSessionDto } from './dto/demo-chunked-upload-session.dto';
import { DemoUploadFileFieldsDto } from './dto/demo-upload-file-fields.dto';
import { DemoUploadFilesDto } from './dto/demo-upload-files.dto';

describe('DemoUploadController', () => {
  const pngFile = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64',
  );
  const demoUploadStorageRoot = join(tmpdir(), 'gnester-lite-demo-upload');
  let app: INestApplication<App> | undefined;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DemoUploadModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    // AI modified: always remove uploaded test files even when application shutdown fails.
    const cleanupOutcomes = await Promise.allSettled([
      app?.close() ?? Promise.resolve(),
      rm(demoUploadStorageRoot, { recursive: true, force: true }),
    ]);
    app = undefined;
    const cleanupFailures: unknown[] = [];

    for (const cleanupOutcome of cleanupOutcomes) {
      if (cleanupOutcome.status === 'rejected') {
        cleanupFailures.push(cleanupOutcome.reason as unknown);
      }
    }

    if (cleanupFailures.length > 0) {
      throw new AggregateError(
        cleanupFailures,
        'Demo upload test cleanup failed.',
      );
    }
  });

  it('returns metadata for a single uploaded file', async () => {
    const httpServer = getHttpServer(app);

    await request(httpServer)
      .post('/demo-upload/single')
      .attach('file', Buffer.from('hello upload'), {
        filename: 'hello.txt',
        contentType: 'text/plain',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({
          fieldName: 'file',
          originalName: 'hello.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
          size: 12,
        });
      });
  });

  it('rejects a missing required single file', async () => {
    const httpServer = getHttpServer(app);

    await request(httpServer).post('/demo-upload/single').expect(422);
  });

  it('rejects a whitespace-only uploaded filename', async () => {
    const httpServer = getHttpServer(app);

    await request(httpServer)
      .post('/demo-upload/single')
      .attach('file', Buffer.from('hello upload'), {
        filename: '   ',
        contentType: 'text/plain',
      })
      .expect(422);
  });

  it('accepts an image file when its content type is allowed', async () => {
    const httpServer = getHttpServer(app);

    await request(httpServer)
      .post('/demo-upload/image')
      .attach('image', pngFile, {
        filename: 'pixel.png',
        contentType: 'image/png',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          fieldName: 'image',
          originalName: 'pixel.png',
          mimeType: 'image/png',
          size: pngFile.length,
        });
      });
  });

  it('rejects an image upload when the file type is not allowed', async () => {
    const httpServer = getHttpServer(app);

    await request(httpServer)
      .post('/demo-upload/image')
      .attach('image', Buffer.from('plain text'), {
        filename: 'note.txt',
        contentType: 'text/plain',
      })
      .expect(422);
  });

  // AI modified: verifies a spoofed Content-Type cannot replace magic-byte detection.
  it('rejects plain text that claims to be a PNG image', async () => {
    const httpServer = getHttpServer(app);

    await request(httpServer)
      .post('/demo-upload/image')
      .attach('image', Buffer.from('plain text'), {
        filename: 'spoofed.png',
        contentType: 'image/png',
      })
      .expect(422);
  });

  it('returns metadata for an array of files uploaded under one field', async () => {
    const httpServer = getHttpServer(app);

    await request(httpServer)
      .post('/demo-upload/files')
      .attach('files', Buffer.from('first'), {
        filename: 'first.txt',
        contentType: 'text/plain',
      })
      .attach('files', Buffer.from('second'), {
        filename: 'second.txt',
        contentType: 'text/plain',
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as DemoUploadFilesDto;

        expect(body.count).toBe(2);
        expect(body.files).toEqual([
          expect.objectContaining({
            fieldName: 'files',
            originalName: 'first.txt',
            size: 5,
          }),
          expect.objectContaining({
            fieldName: 'files',
            originalName: 'second.txt',
            size: 6,
          }),
        ]);
      });
  });

  it('rejects file arrays that exceed the configured max count', async () => {
    const httpServer = getHttpServer(app);
    const uploadRequest = request(httpServer).post('/demo-upload/files');

    for (let index = 0; index <= DEMO_UPLOAD_MAX_FILES; index += 1) {
      uploadRequest.attach('files', Buffer.from(`file-${index}`), {
        filename: `file-${index}.txt`,
        contentType: 'text/plain',
      });
    }

    await uploadRequest.expect(400);
  });

  it('rejects uploads that exceed the configured max file size', async () => {
    const httpServer = getHttpServer(app);

    await request(httpServer)
      .post('/demo-upload/single')
      .attach('file', Buffer.alloc(DEMO_UPLOAD_MAX_FILE_SIZE_BYTES + 1), {
        filename: 'too-large.bin',
        contentType: 'application/octet-stream',
      })
      .expect(413);
  });

  it('rejects text fields on file-only multipart routes', async () => {
    const httpServer = getHttpServer(app);

    await request(httpServer)
      .post('/demo-upload/single')
      .field('description', 'not accepted')
      .attach('file', Buffer.from('hello upload'), {
        filename: 'hello.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('returns grouped metadata for files uploaded under named fields', async () => {
    const httpServer = getHttpServer(app);

    await request(httpServer)
      .post('/demo-upload/profile-assets')
      .attach('avatar', pngFile, {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .attach('background', Buffer.from('background'), {
        filename: 'background.txt',
        contentType: 'text/plain',
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as DemoUploadFileFieldsDto;

        expect(body.fields.avatar).toEqual([
          expect.objectContaining({
            fieldName: 'avatar',
            originalName: 'avatar.png',
          }),
        ]);
        expect(body.fields.background).toEqual([
          expect.objectContaining({
            fieldName: 'background',
            originalName: 'background.txt',
          }),
        ]);
      });
  });

  it('returns metadata for arbitrary file fields with AnyFilesInterceptor', async () => {
    const httpServer = getHttpServer(app);

    await request(httpServer)
      .post('/demo-upload/any')
      .attach('receipt', Buffer.from('receipt'), {
        filename: 'receipt.txt',
        contentType: 'text/plain',
      })
      .attach('avatar', pngFile, {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as DemoUploadFilesDto;

        expect(body.count).toBe(2);
        expect(body.files).toEqual([
          expect.objectContaining({ fieldName: 'receipt' }),
          expect.objectContaining({ fieldName: 'avatar' }),
        ]);
      });
  });

  it('accepts chunked uploads through a session, chunk, status, and complete flow', async () => {
    const httpServer = getHttpServer(app);
    const firstChunk = Buffer.from('hello ');
    const secondChunk = Buffer.from('world');
    const file = Buffer.concat([firstChunk, secondChunk]);
    const checksum = createHash('sha256').update(file).digest('hex');

    const sessionResponse = await request(httpServer)
      .post('/demo-upload/chunked/sessions')
      .send({
        originalName: 'large-note.txt',
        mimeType: 'text/plain',
        fileSize: file.byteLength,
        chunkSize: firstChunk.byteLength,
        totalChunks: 2,
        checksum,
      })
      .expect(201);
    const session = sessionResponse.body as DemoChunkedUploadSessionDto;

    expect(session).toEqual(
      expect.objectContaining({
        originalName: 'large-note.txt',
        mimeType: 'text/plain',
        fileSize: file.byteLength,
        chunkSize: firstChunk.byteLength,
        totalChunks: 2,
        uploadedBytes: 0,
        receivedChunks: [],
        missingChunks: [0, 1],
        isComplete: false,
      }),
    );

    await request(httpServer)
      .put(`/demo-upload/chunked/${session.uploadId}/chunks/0`)
      .attach(DEMO_UPLOAD_CHUNK_FIELD_NAME, firstChunk, {
        filename: '000000.chunk',
        contentType: 'application/octet-stream',
      })
      .expect(200)
      .expect(({ body }) => {
        const uploadSession = body as DemoChunkedUploadSessionDto;

        expect(uploadSession.uploadedBytes).toBe(firstChunk.byteLength);
        expect(uploadSession.receivedChunks).toEqual([0]);
        expect(uploadSession.missingChunks).toEqual([1]);
      });

    await request(httpServer)
      .put(`/demo-upload/chunked/${session.uploadId}/chunks/1`)
      .attach(DEMO_UPLOAD_CHUNK_FIELD_NAME, secondChunk, {
        filename: '000001.chunk',
        contentType: 'application/octet-stream',
      })
      .expect(200);

    await request(httpServer)
      .get(`/demo-upload/chunked/${session.uploadId}`)
      .expect(200)
      .expect(({ body }) => {
        const uploadSession = body as DemoChunkedUploadSessionDto;

        expect(uploadSession.uploadedBytes).toBe(file.byteLength);
        expect(uploadSession.receivedChunks).toEqual([0, 1]);
        expect(uploadSession.missingChunks).toEqual([]);
      });

    await request(httpServer)
      .post(`/demo-upload/chunked/${session.uploadId}/complete`)
      .expect(201)
      .expect(({ body }) => {
        const completedUpload = body as DemoChunkedUploadCompleteDto;

        expect(completedUpload).toEqual({
          uploadId: session.uploadId,
          originalName: 'large-note.txt',
          mimeType: 'text/plain',
          size: file.byteLength,
          checksum,
          isChecksumVerified: true,
          storedFileName: `${session.uploadId}.complete`,
        });
      });
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
    ['overlong', 'x'.repeat(DEMO_UPLOAD_MAX_ORIGINAL_NAME_LENGTH + 1)],
  ])(
    'rejects a chunked session with an %s original name',
    async (_scenario, originalName) => {
      const dto = plainToInstance(CreateDemoChunkedUploadDto, {
        originalName,
        mimeType: 'text/plain',
        fileSize: 3,
        chunkSize: 3,
        totalChunks: 1,
      });

      await expect(validate(dto)).resolves.not.toHaveLength(0);
    },
  );

  it('rejects a non-canonical uppercase chunked checksum', async () => {
    const dto = plainToInstance(CreateDemoChunkedUploadDto, {
      originalName: 'note.txt',
      mimeType: 'text/plain',
      fileSize: 3,
      chunkSize: 3,
      totalChunks: 1,
      checksum: 'A'.repeat(64),
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('rejects completing a chunked upload while chunks are missing', async () => {
    const httpServer = getHttpServer(app);
    const firstChunk = Buffer.from('hello');

    const sessionResponse = await request(httpServer)
      .post('/demo-upload/chunked/sessions')
      .send({
        originalName: 'incomplete.txt',
        mimeType: 'text/plain',
        fileSize: 10,
        chunkSize: 5,
        totalChunks: 2,
      })
      .expect(201);
    const session = sessionResponse.body as DemoChunkedUploadSessionDto;

    await request(httpServer)
      .put(`/demo-upload/chunked/${session.uploadId}/chunks/0`)
      .attach(DEMO_UPLOAD_CHUNK_FIELD_NAME, firstChunk, {
        filename: '000000.chunk',
        contentType: 'application/octet-stream',
      })
      .expect(200);

    await request(httpServer)
      .post(`/demo-upload/chunked/${session.uploadId}/complete`)
      .expect(400);
  });

  it('cancels abandoned chunked upload sessions', async () => {
    const httpServer = getHttpServer(app);
    const sessionResponse = await request(httpServer)
      .post('/demo-upload/chunked/sessions')
      .send({
        originalName: 'cancelled.txt',
        mimeType: 'text/plain',
        fileSize: 5,
        chunkSize: 5,
        totalChunks: 1,
      })
      .expect(201);
    const session = sessionResponse.body as DemoChunkedUploadSessionDto;

    await request(httpServer)
      .delete(`/demo-upload/chunked/${session.uploadId}`)
      .expect(204);
    await request(httpServer)
      .get(`/demo-upload/chunked/${session.uploadId}`)
      .expect(404);
  });

  it('accepts multipart form fields without files', async () => {
    const httpServer = getHttpServer(app);

    await request(httpServer)
      .post('/demo-upload/form')
      .field('title', 'profile')
      .field('enabled', 'true')
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({
          fields: {
            title: 'profile',
            enabled: 'true',
          },
        });
      });
  });

  it('rejects files on the multipart form-only endpoint', async () => {
    const httpServer = getHttpServer(app);

    await request(httpServer)
      .post('/demo-upload/form')
      .field('title', 'profile')
      .attach('file', Buffer.from('not allowed'), {
        filename: 'file.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('rejects multipart forms that exceed the field-count limit', async () => {
    const httpServer = getHttpServer(app);
    const formRequest = request(httpServer).post('/demo-upload/form');

    for (let index = 0; index <= DEMO_UPLOAD_MAX_FORM_FIELDS; index += 1) {
      formRequest.field(`field-${index}`, String(index));
    }

    await formRequest.expect(400);
  });

  it('rejects multipart form fields that exceed the byte limit', async () => {
    const httpServer = getHttpServer(app);

    await request(httpServer)
      .post('/demo-upload/form')
      .field(
        'description',
        'x'.repeat(DEMO_UPLOAD_MAX_FORM_FIELD_SIZE_BYTES + 1),
      )
      .expect(400);
  });
});

function getHttpServer(app: INestApplication<App> | undefined): App {
  if (!app) {
    throw new Error('Nest application was not initialized');
  }

  return app.getHttpServer();
}
