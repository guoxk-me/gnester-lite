// CN: DTO 文件，定义 demo-session 的数据结构；EN: DTO file defines data shapes for demo-session.
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  DEMO_SESSION_FLASH_LEVELS,
  type DemoSessionFlashLevel,
} from '../demo-session.types';

export class CreateDemoSessionFlashDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(160)
  readonly message: string;

  @IsIn(DEMO_SESSION_FLASH_LEVELS)
  @IsOptional()
  readonly level?: DemoSessionFlashLevel;
}
