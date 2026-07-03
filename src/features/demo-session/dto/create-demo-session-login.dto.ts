// CN: DTO 文件，定义 demo-session 的数据结构；EN: DTO file defines data shapes for demo-session.
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

import {
  DEMO_SESSION_ROLES,
  type DemoSessionRole,
} from '../demo-session.types';

export class CreateDemoSessionLoginDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9:_-]+$/)
  readonly userId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  readonly displayName: string;

  @IsIn(DEMO_SESSION_ROLES)
  @IsOptional()
  readonly role?: DemoSessionRole;
}
