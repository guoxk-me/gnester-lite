import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DemoUploadModule } from '../../src/examples/demo-upload/demo-upload.module.js';

describe('Demo upload (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DemoUploadModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a real multipart file through the patched Multer interceptor', async () => {
    // AI modified: verify the ESM upload interceptor still accepts multipart requests with Multer 2.4.
    await request(app.getHttpServer())
      .post('/demo-upload/single')
      .attach('file', Buffer.from('patched-upload'), {
        filename: 'example.txt',
        contentType: 'text/plain',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          fieldName: 'file',
          originalName: 'example.txt',
          mimeType: 'text/plain',
          size: 14,
        });
      });
  });
});
