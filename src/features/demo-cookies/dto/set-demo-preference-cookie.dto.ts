// CN: DTO 文件，定义 demo-cookies 的数据结构；EN: DTO file defines data shapes for demo-cookies.
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SetDemoPreferenceCookieDto {
  @IsString()
  @IsIn(['light', 'dark', 'system'])
  readonly theme: string;

  @IsString()
  @IsOptional()
  @MaxLength(16)
  readonly locale?: string;
}
