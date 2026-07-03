// CN: 类型文件，描述 demo-streaming-files 的 TypeScript 契约；EN: Type file describes TypeScript contracts for demo-streaming-files.
import type { Readable } from 'node:stream';

export type DemoStreamingFileDisposition = 'attachment' | 'inline';

export type DemoStreamingFileDownload = {
  readonly body: Readable | Uint8Array;
  readonly contentType: string;
  readonly disposition: DemoStreamingFileDisposition;
  readonly fileName: string;
  readonly contentLength: number;
};
