import type { Readable } from 'node:stream';

export type DemoStreamingFileDisposition = 'attachment' | 'inline';

export type DemoStreamingFileDownload = {
  readonly body: Readable | Uint8Array;
  readonly contentType: string;
  readonly disposition: DemoStreamingFileDisposition;
  readonly fileName: string;
  readonly contentLength: number;
};
