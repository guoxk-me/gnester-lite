// CN: DTO 文件，定义 demo-queue 的数据结构；EN: DTO file defines data shapes for demo-queue.
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateDemoLongTaskJobDto {
  @IsString()
  @MaxLength(80)
  readonly taskName: string;

  @IsInt()
  @Min(1_000)
  @Max(30_000)
  readonly durationMs: number;

  @IsInt()
  @Min(1)
  @Max(20)
  readonly steps: number;
}
