// CN: 测试文件，验证 demo-upload 的行为契约；EN: Test file verifies behavior contracts for demo-upload.
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
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
} from './demo-upload.constants';
import { DemoUploadModule } from './demo-upload.module';
import { DemoChunkedUploadCompleteDto } from './dto/demo-chunked-upload-complete.dto';
import { DemoChunkedUploadSessionDto } from './dto/demo-chunked-upload-session.dto';
import { DemoUploadFileFieldsDto } from './dto/demo-upload-file-fields.dto';
import { DemoUploadFilesDto } from './dto/demo-upload-files.dto';

// CN: 测试分组：DemoUploadController；EN: Test group: DemoUploadController.
describe('DemoUploadController', () => {
  const pngFile = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64',
  );
  const demoUploadStorageRoot = join(tmpdir(), 'gnester-lite-demo-upload');
  let app: INestApplication<App> | undefined;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DemoUploadModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  // CN: 测试清理，组织或验证测试流程；EN: Test cleanup organizes or verifies the test flow.
  afterEach(async () => {
    await app?.close();
    await rm(demoUploadStorageRoot, { recursive: true, force: true });
  });

  // CN: 测试用例：returns metadata for a single uploaded file；EN: Test case: returns metadata for a single uploaded file.
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

  // CN: 测试用例：rejects a missing required single file；EN: Test case: rejects a missing required single file.
  it('rejects a missing required single file', async () => {
    const httpServer = getHttpServer(app);

    await request(httpServer).post('/demo-upload/single').expect(422);
  });

  // CN: 测试用例：accepts an image file when its content type is allowed；EN: Test case: accepts an image file when its content type is allowed.
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

  // CN: 测试用例：rejects an image upload when the file type is not allowed；EN: Test case: rejects an image upload when the file type is not allowed.
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

  // CN: 测试用例：returns metadata for an array of files uploaded under one field；EN: Test case: returns metadata for an array of files uploaded under one field.
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

  // CN: 测试用例：rejects file arrays that exceed the configured max count；EN: Test case: rejects file arrays that exceed the configured max count.
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

  // CN: 测试用例：rejects uploads that exceed the configured max file size；EN: Test case: rejects uploads that exceed the configured max file size.
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

  // CN: 测试用例：returns grouped metadata for files uploaded under named fields；EN: Test case: returns grouped metadata for files uploaded under named fields.
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

  // CN: 测试用例：returns metadata for arbitrary file fields with AnyFilesInterceptor；EN: Test case: returns metadata for arbitrary file fields with AnyFilesInterceptor.
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

  // CN: 测试用例：accepts chunked uploads through a session, chunk, status, and complete flow；EN: Test case: accepts chunked uploads through a session, chunk, status, and complete flow.
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

  // CN: 测试用例：rejects completing a chunked upload while chunks are missing；EN: Test case: rejects completing a chunked upload while chunks are missing.
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

  // CN: 测试用例：accepts multipart form fields without files；EN: Test case: accepts multipart form fields without files.
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

  // CN: 测试用例：rejects files on the multipart form-only endpoint；EN: Test case: rejects files on the multipart form-only endpoint.
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
});

// CN: 准备或验证 demo-upload 的 get http server 测试逻辑；EN: Prepares or verifies the get http server test logic for demo-upload.
function getHttpServer(app: INestApplication<App> | undefined): App {
  if (!app) {
    throw new Error('Nest application was not initialized');
  }

  return app.getHttpServer();
}
