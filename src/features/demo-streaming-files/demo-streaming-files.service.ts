// CN: 服务，承载 demo-streaming-files 的业务逻辑；EN: Service holds business logic for demo-streaming-files.
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename, isAbsolute, relative, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { DemoStreamingFileScenarioDto } from './dto/demo-streaming-file-scenario.dto';
import type {
  DemoStreamingFileDisposition,
  DemoStreamingFileDownload,
} from './demo-streaming-files.types';

type NodeError = Error & { readonly code?: string };

@Injectable()
export class DemoStreamingFilesService {
  private readonly projectRoot = process.cwd();

  // CN: 执行 demo-streaming-files 的 list scenarios 业务逻辑；EN: Runs the list scenarios business logic for demo-streaming-files.
  listScenarios(): DemoStreamingFileScenarioDto[] {
    return [
      new DemoStreamingFileScenarioDto({
        route: 'GET /demo-streaming-files/project/package-json',
        scenario: 'Download an existing project file from disk',
        demonstrates:
          'streaming a real file with JSON content type, attachment disposition, and content length',
      }),
      new DemoStreamingFileScenarioDto({
        route: 'GET /demo-streaming-files/project/readme',
        scenario: 'Preview an existing text file inline',
        demonstrates:
          'streaming a real file with inline disposition for browser preview',
      }),
      new DemoStreamingFileScenarioDto({
        route: 'GET /demo-streaming-files/generated/report.csv',
        scenario: 'Download a generated CSV export',
        demonstrates:
          'streaming runtime-generated export content without writing a temporary file',
      }),
      new DemoStreamingFileScenarioDto({
        route: 'GET /demo-streaming-files/generated/note.txt',
        scenario: 'Download a small generated buffer',
        demonstrates:
          'using StreamableFile with an in-memory Buffer for small generated files',
      }),
    ];
  }

  // CN: 执行 demo-streaming-files 的 create package json download 业务逻辑；EN: Runs the create package json download business logic for demo-streaming-files.
  createPackageJsonDownload(): Promise<DemoStreamingFileDownload> {
    return this.createProjectFileResponse(
      'package.json',
      'application/json',
      'attachment',
    );
  }

  // CN: 执行 demo-streaming-files 的 create readme preview 业务逻辑；EN: Runs the create readme preview business logic for demo-streaming-files.
  createReadmePreview(): Promise<DemoStreamingFileDownload> {
    return this.createProjectFileResponse(
      'README.md',
      'text/markdown; charset=utf-8',
      'inline',
    );
  }

  // CN: 执行 demo-streaming-files 的 create generated csv download 业务逻辑；EN: Runs the create generated csv download business logic for demo-streaming-files.
  createGeneratedCsvDownload(): DemoStreamingFileDownload {
    const content = [
      'id,name,status',
      '1,Ada Lovelace,active',
      '2,Grace Hopper,invited',
      '3,Katherine Johnson,active',
    ].join('\n');

    return {
      body: Readable.from([content]),
      contentType: 'text/csv; charset=utf-8',
      disposition: 'attachment',
      fileName: 'demo-report.csv',
      contentLength: Buffer.byteLength(content),
    };
  }

  // CN: 执行 demo-streaming-files 的 create generated note download 业务逻辑；EN: Runs the create generated note download business logic for demo-streaming-files.
  createGeneratedNoteDownload(): DemoStreamingFileDownload {
    const content = [
      'StreamableFile accepts either a Node.js Readable stream or a Buffer.',
      'Use a Buffer for small generated files and a stream for large files.',
    ].join('\n');
    const body = Buffer.from(content, 'utf8');

    return {
      body,
      contentType: 'text/plain; charset=utf-8',
      disposition: 'attachment',
      fileName: 'demo-note.txt',
      contentLength: body.byteLength,
    };
  }

  // CN: 执行 demo-streaming-files 的 create project file response 业务逻辑；EN: Runs the create project file response business logic for demo-streaming-files.
  private async createProjectFileResponse(
    fileName: string,
    contentType: string,
    disposition: DemoStreamingFileDisposition,
  ): Promise<DemoStreamingFileDownload> {
    const filePath = this.resolveProjectFile(fileName);

    try {
      const fileStat = await stat(filePath);

      if (!fileStat.isFile()) {
        throw new NotFoundException(`Demo file "${fileName}" was not found.`);
      }

      return {
        body: createReadStream(filePath),
        contentType,
        disposition,
        fileName: basename(filePath),
        contentLength: fileStat.size,
      };
    } catch (error: unknown) {
      if (this.isMissingFileError(error)) {
        throw new NotFoundException(`Demo file "${fileName}" was not found.`);
      }

      throw error;
    }
  }

  // CN: 执行 demo-streaming-files 的 resolve project file 业务逻辑；EN: Runs the resolve project file business logic for demo-streaming-files.
  private resolveProjectFile(fileName: string): string {
    const filePath = resolve(this.projectRoot, fileName);
    const relativePath = relative(this.projectRoot, filePath);

    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new BadRequestException(
        'Demo file path must stay inside project root.',
      );
    }

    return filePath;
  }

  // CN: 执行 demo-streaming-files 的 is missing file error 业务逻辑；EN: Runs the is missing file error business logic for demo-streaming-files.
  private isMissingFileError(error: unknown): error is NodeError {
    return error instanceof Error && (error as NodeError).code === 'ENOENT';
  }
}
