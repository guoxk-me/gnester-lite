// CN: 测试文件，验证 demo-streaming-files 的行为契约；EN: Test file verifies behavior contracts for demo-streaming-files.
import { stat } from 'node:fs/promises';
import { DemoStreamingFilesService } from './demo-streaming-files.service';
import type { DemoStreamingFileDownload } from './demo-streaming-files.types';

// CN: 测试分组：DemoStreamingFilesService；EN: Test group: DemoStreamingFilesService.
describe('DemoStreamingFilesService', () => {
  let service: DemoStreamingFilesService;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    service = new DemoStreamingFilesService();
  });

  // CN: 测试用例：lists the streaming file demo scenarios exposed by the controller；EN: Test case: lists the streaming file demo scenarios exposed by the controller.
  it('lists the streaming file demo scenarios exposed by the controller', () => {
    const scenarios = service.listScenarios();

    expect(scenarios).toEqual([
      expect.objectContaining({
        route: 'GET /demo-streaming-files/project/package-json',
        scenario: 'Download an existing project file from disk',
      }),
      expect.objectContaining({
        route: 'GET /demo-streaming-files/project/readme',
        scenario: 'Preview an existing text file inline',
      }),
      expect.objectContaining({
        route: 'GET /demo-streaming-files/generated/report.csv',
        scenario: 'Download a generated CSV export',
      }),
      expect.objectContaining({
        route: 'GET /demo-streaming-files/generated/note.txt',
        scenario: 'Download a small generated buffer',
      }),
    ]);
  });

  // CN: 测试用例：streams package.json as a downloadable JSON file with content length；EN: Test case: streams package.json as a downloadable JSON file with content length.
  it('streams package.json as a downloadable JSON file with content length', async () => {
    const packageJsonStat = await stat('package.json');

    const file = await service.createPackageJsonDownload();

    expect(file.contentType).toBe('application/json');
    expect(file.disposition).toBe('attachment');
    expect(file.fileName).toBe('package.json');
    expect(file.contentLength).toBe(packageJsonStat.size);
    await expect(readFileResponse(file)).resolves.toContain('"name"');
  });

  // CN: 测试用例：streams README.md inline for browser preview；EN: Test case: streams README.md inline for browser preview.
  it('streams README.md inline for browser preview', async () => {
    const readmeStat = await stat('README.md');

    const file = await service.createReadmePreview();

    expect(file.contentType).toBe('text/markdown; charset=utf-8');
    expect(file.disposition).toBe('inline');
    expect(file.fileName).toBe('README.md');
    expect(file.contentLength).toBe(readmeStat.size);
    await expect(readFileResponse(file)).resolves.toContain('# gnester-lite');
  });

  // CN: 测试用例：streams generated CSV export content without a temporary file；EN: Test case: streams generated CSV export content without a temporary file.
  it('streams generated CSV export content without a temporary file', async () => {
    const file = service.createGeneratedCsvDownload();

    expect(file.contentType).toBe('text/csv; charset=utf-8');
    expect(file.disposition).toBe('attachment');
    expect(file.fileName).toBe('demo-report.csv');
    await expect(readFileResponse(file)).resolves.toBe(
      [
        'id,name,status',
        '1,Ada Lovelace,active',
        '2,Grace Hopper,invited',
        '3,Katherine Johnson,active',
      ].join('\n'),
    );
  });

  // CN: 测试用例：returns small generated content as an in-memory buffer；EN: Test case: returns small generated content as an in-memory buffer.
  it('returns small generated content as an in-memory buffer', async () => {
    const file = service.createGeneratedNoteDownload();

    expect(file.contentType).toBe('text/plain; charset=utf-8');
    expect(file.disposition).toBe('attachment');
    expect(file.fileName).toBe('demo-note.txt');
    expect(file.body).toBeInstanceOf(Buffer);
    await expect(readFileResponse(file)).resolves.toContain(
      'StreamableFile accepts either a Node.js Readable stream or a Buffer.',
    );
  });
});

// CN: 准备或验证 demo-streaming-files 的 read file response 测试逻辑；EN: Prepares or verifies the read file response test logic for demo-streaming-files.
async function readFileResponse(
  file: DemoStreamingFileDownload,
): Promise<string> {
  if (file.body instanceof Uint8Array) {
    return Buffer.from(file.body).toString('utf8');
  }

  const chunks: Buffer[] = [];

  for await (const chunk of file.body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }

  return Buffer.concat(chunks).toString('utf8');
}
