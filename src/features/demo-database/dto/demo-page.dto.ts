// CN: DTO 文件，定义 demo-database 的数据结构；EN: DTO file defines data shapes for demo-database.
import { Demo } from '../entities/demo.entity';

export class DemoPageDto {
  readonly data: Demo[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}
