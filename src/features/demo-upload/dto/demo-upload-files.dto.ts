// CN: DTO 文件，定义 demo-upload 的数据结构；EN: DTO file defines data shapes for demo-upload.
import { DemoUploadFileDto } from './demo-upload-file.dto';

export class DemoUploadFilesDto {
  readonly count: number;
  readonly files: DemoUploadFileDto[];
}
