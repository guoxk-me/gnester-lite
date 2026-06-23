// CN: DTO 文件，定义 demo-queue 的数据结构；EN: DTO file defines data shapes for demo-queue.
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateDemoSubtaskDto {
  @IsString()
  @MaxLength(80)
  readonly name: string;

  @IsInt()
  @Min(500)
  @Max(15_000)
  readonly durationMs: number;
}

export class CreateDemoSubtaskWorkflowDto {
  @IsString()
  @MaxLength(80)
  readonly workflowName: string;

  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateDemoSubtaskDto)
  readonly subtasks: CreateDemoSubtaskDto[];
}
