// CN: DTO 文件，定义 demo-csrf 的数据结构；EN: DTO file defines data shapes for demo-csrf.
import { IsNumber, IsString, Max, Min } from 'class-validator';

export class CreateDemoCsrfTransferDto {
  @IsString()
  readonly recipient: string;

  @IsNumber()
  @Min(1)
  @Max(10_000)
  readonly amount: number;
}
