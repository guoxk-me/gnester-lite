import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export const DEMO_QUEUE_TASK_NAME_MAX_LENGTH = 80;

export class CreateDemoLongTaskJobDto {
  // AI modified: reject empty semantic job names before queueing long-running work.
  @ApiProperty({
    minLength: 1,
    maxLength: DEMO_QUEUE_TASK_NAME_MAX_LENGTH,
    pattern: '\\S',
  })
  @IsString()
  @Matches(/\S/)
  @MaxLength(DEMO_QUEUE_TASK_NAME_MAX_LENGTH)
  readonly taskName!: string;

  @ApiProperty({ minimum: 1_000, maximum: 30_000 })
  @IsInt()
  @Min(1_000)
  @Max(30_000)
  readonly durationMs!: number;

  @ApiProperty({ minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  readonly steps!: number;
}
