import { DemoResponseDto } from './demo-response.dto.js';

export class DemoPageDto {
  readonly data!: DemoResponseDto[];
  readonly total!: number;
  readonly page!: number;
  readonly limit!: number;
}
