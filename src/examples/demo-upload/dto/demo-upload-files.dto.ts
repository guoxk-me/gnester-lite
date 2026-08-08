import { DemoUploadFileDto } from './demo-upload-file.dto';

export class DemoUploadFilesDto {
  readonly count!: number;
  readonly files!: DemoUploadFileDto[];
}
