import { stat } from 'node:fs/promises';
import { DemoStreamingFilesService } from './demo-streaming-files.service';
import type { DemoStreamingFileDownload } from './demo-streaming-files.types';

describe('DemoStreamingFilesService', () => {
  let service: DemoStreamingFilesService;

  beforeEach(() => {
    service = new DemoStreamingFilesService();
  });

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

  it('streams package.json as a downloadable JSON file with content length', async () => {
    const packageJsonStat = await stat('package.json');

    const file = await service.createPackageJsonDownload();

    expect(file.contentType).toBe('application/json');
    expect(file.disposition).toBe('attachment');
    expect(file.fileName).toBe('package.json');
    expect(file.contentLength).toBe(packageJsonStat.size);
    await expect(readFileResponse(file)).resolves.toContain('"name"');
  });

  it('streams README.md inline for browser preview', async () => {
    const readmeStat = await stat('README.md');

    const file = await service.createReadmePreview();

    expect(file.contentType).toBe('text/markdown; charset=utf-8');
    expect(file.disposition).toBe('inline');
    expect(file.fileName).toBe('README.md');
    expect(file.contentLength).toBe(readmeStat.size);
    await expect(readFileResponse(file)).resolves.toContain('# gnester-lite');
  });

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
