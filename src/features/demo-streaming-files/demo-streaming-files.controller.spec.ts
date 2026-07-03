// CN: 测试文件，验证 demo-streaming-files 的行为契约；EN: Test file verifies behavior contracts for demo-streaming-files.
import { StreamableFile } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'node:stream';
import { DemoStreamingFilesController } from './demo-streaming-files.controller';
import { DemoStreamingFilesService } from './demo-streaming-files.service';

// CN: 测试分组：DemoStreamingFilesController；EN: Test group: DemoStreamingFilesController.
describe('DemoStreamingFilesController', () => {
  const service: jest.Mocked<
    Pick<
      DemoStreamingFilesService,
      | 'listScenarios'
      | 'createPackageJsonDownload'
      | 'createReadmePreview'
      | 'createGeneratedCsvDownload'
      | 'createGeneratedNoteDownload'
    >
  > = {
    listScenarios: jest.fn(),
    createPackageJsonDownload: jest.fn(),
    createReadmePreview: jest.fn(),
    createGeneratedCsvDownload: jest.fn(),
    createGeneratedNoteDownload: jest.fn(),
  };
  let controller: DemoStreamingFilesController;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoStreamingFilesController],
      providers: [
        {
          provide: DemoStreamingFilesService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DemoStreamingFilesController>(
      DemoStreamingFilesController,
    );
  });

  // CN: 测试用例：returns the streaming files demo overview；EN: Test case: returns the streaming files demo overview.
  it('returns the streaming files demo overview', () => {
    const scenarios = [
      {
        route: 'GET /demo-streaming-files/generated/report.csv',
        scenario: 'Download a generated CSV export',
        demonstrates: 'runtime-generated export content',
      },
    ];
    service.listScenarios.mockReturnValueOnce(scenarios);

    expect(controller.listScenarios()).toEqual(scenarios);
    expect(service.listScenarios).toHaveBeenCalled();
  });

  // CN: 测试用例：wraps package.json download metadata in a StreamableFile；EN: Test case: wraps package.json download metadata in a StreamableFile.
  it('wraps package.json download metadata in a StreamableFile', async () => {
    service.createPackageJsonDownload.mockResolvedValueOnce({
      body: Readable.from(['{"name":"demo"}']),
      contentType: 'application/json',
      disposition: 'attachment',
      fileName: 'package.json',
      contentLength: 15,
    });

    const file = await controller.downloadPackageJson();

    expect(file).toBeInstanceOf(StreamableFile);
    expect(file.getHeaders()).toEqual({
      type: 'application/json',
      disposition: 'attachment; filename="package.json"',
      length: 15,
    });
  });

  // CN: 测试用例：wraps README preview metadata in a StreamableFile；EN: Test case: wraps README preview metadata in a StreamableFile.
  it('wraps README preview metadata in a StreamableFile', async () => {
    service.createReadmePreview.mockResolvedValueOnce({
      body: Readable.from(['# Demo']),
      contentType: 'text/markdown; charset=utf-8',
      disposition: 'inline',
      fileName: 'README.md',
      contentLength: 6,
    });

    const file = await controller.previewReadme();

    expect(file.getHeaders()).toEqual({
      type: 'text/markdown; charset=utf-8',
      disposition: 'inline; filename="README.md"',
      length: 6,
    });
  });

  // CN: 测试用例：wraps generated CSV metadata in a StreamableFile；EN: Test case: wraps generated CSV metadata in a StreamableFile.
  it('wraps generated CSV metadata in a StreamableFile', () => {
    service.createGeneratedCsvDownload.mockReturnValueOnce({
      body: Readable.from(['id,name']),
      contentType: 'text/csv; charset=utf-8',
      disposition: 'attachment',
      fileName: 'demo-report.csv',
      contentLength: 7,
    });

    const file = controller.downloadGeneratedCsv();

    expect(file.getHeaders()).toEqual({
      type: 'text/csv; charset=utf-8',
      disposition: 'attachment; filename="demo-report.csv"',
      length: 7,
    });
  });

  // CN: 测试用例：wraps generated Buffer metadata in a StreamableFile；EN: Test case: wraps generated Buffer metadata in a StreamableFile.
  it('wraps generated Buffer metadata in a StreamableFile', () => {
    service.createGeneratedNoteDownload.mockReturnValueOnce({
      body: Buffer.from('note'),
      contentType: 'text/plain; charset=utf-8',
      disposition: 'attachment',
      fileName: 'demo-note.txt',
      contentLength: 4,
    });

    const file = controller.downloadGeneratedNote();

    expect(file.getHeaders()).toEqual({
      type: 'text/plain; charset=utf-8',
      disposition: 'attachment; filename="demo-note.txt"',
      length: 4,
    });
  });
});
