import { DemoUploadFileDto } from './demo-upload-file.dto.js';

export class DemoUploadFilesDto {
  readonly count!: number;
  readonly files!: DemoUploadFileDto[];
}
