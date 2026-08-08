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

  createPackageJsonDownload(): Promise<DemoStreamingFileDownload> {
    return this.createProjectFileResponse(
      'package.json',
      'application/json',
      'attachment',
    );
  }

  createReadmePreview(): Promise<DemoStreamingFileDownload> {
    return this.createProjectFileResponse(
      'README.md',
      'text/markdown; charset=utf-8',
      'inline',
    );
  }

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

  private isMissingFileError(error: unknown): error is NodeError {
    return error instanceof Error && (error as NodeError).code === 'ENOENT';
  }
}
