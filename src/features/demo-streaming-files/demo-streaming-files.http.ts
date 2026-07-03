// CN: HTTP 边界文件，集中 demo-streaming-files 的 StreamableFile 响应适配；EN: HTTP boundary file centralizes demo-streaming-files StreamableFile response adaptation.
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

  return new StreamableFile(file.body, options);
}

function getContentDispositionHeader(file: DemoStreamingFileDownload): string {
  const escapedFileName = file.fileName.replace(/["\\]/g, '\\$&');

  return `${file.disposition}; filename="${escapedFileName}"`;
}
