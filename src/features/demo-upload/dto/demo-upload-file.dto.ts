// CN: DTO 文件，定义 demo-upload 的数据结构；EN: DTO file defines data shapes for demo-upload.
export class DemoUploadFileDto {
  readonly fieldName: string;
  readonly originalName: string;
  readonly encoding: string;
  readonly mimeType: string;
  readonly size: number;
}
