import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const DEMO_QUEUE_WORKFLOW_NAME_MAX_LENGTH = 80;
export const DEMO_QUEUE_MAX_SUBTASKS = 10;

export class CreateDemoSubtaskDto {
  // AI modified: workflow and subtask names must carry bounded non-whitespace text.
  @ApiProperty({
    minLength: 1,
    maxLength: DEMO_QUEUE_WORKFLOW_NAME_MAX_LENGTH,
    pattern: '\\S',
  })
  @IsString()
  @Matches(/\S/)
  @MaxLength(DEMO_QUEUE_WORKFLOW_NAME_MAX_LENGTH)
  readonly name!: string;

  @ApiProperty({ minimum: 500, maximum: 15_000 })
  @IsInt()
  @Min(500)
  @Max(15_000)
  readonly durationMs!: number;
}

export class CreateDemoSubtaskWorkflowDto {
  @ApiProperty({
    minLength: 1,
    maxLength: DEMO_QUEUE_WORKFLOW_NAME_MAX_LENGTH,
    pattern: '\\S',
  })
  @IsString()
  @Matches(/\S/)
  @MaxLength(DEMO_QUEUE_WORKFLOW_NAME_MAX_LENGTH)
  readonly workflowName!: string;

  @ApiProperty({
    type: [CreateDemoSubtaskDto],
    minItems: 1,
    maxItems: DEMO_QUEUE_MAX_SUBTASKS,
  })
  @ArrayMinSize(1)
  @ArrayMaxSize(DEMO_QUEUE_MAX_SUBTASKS)
  @ValidateNested({ each: true })
  @Type(() => CreateDemoSubtaskDto)
  readonly subtasks!: CreateDemoSubtaskDto[];
}
