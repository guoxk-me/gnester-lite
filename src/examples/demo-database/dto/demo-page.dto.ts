import { DemoResponseDto } from './demo-response.dto';

export class DemoPageDto {
  readonly data!: DemoResponseDto[];
  readonly total!: number;
  readonly page!: number;
  readonly limit!: number;
}
