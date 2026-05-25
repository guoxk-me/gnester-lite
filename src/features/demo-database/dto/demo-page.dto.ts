import { Demo } from '../entities/demo.entity';

export class DemoPageDto {
  readonly data: Demo[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}
