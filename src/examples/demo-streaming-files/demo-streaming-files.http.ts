import { StreamableFile } from '@nestjs/common';

import type { DemoStreamingFileDownload } from './demo-streaming-files.types';

// AI modified: keeps HTTP response headers out of the streaming file service.
export function createDemoStreamableFile(
  file: DemoStreamingFileDownload,
): StreamableFile {
  const options = {
    type: file.contentType,
    disposition: getContentDispositionHeader(file),
    length: file.contentLength,
  };
  const body = file.body;
  if (body instanceof Uint8Array) {
    return new StreamableFile(body, options);
  }
  return new StreamableFile(body, options);
}

function getContentDispositionHeader(file: DemoStreamingFileDownload): string {
  const escapedFileName = file.fileName.replace(/["\\]/g, '\\$&');

  return `${file.disposition}; filename="${escapedFileName}"`;
}
