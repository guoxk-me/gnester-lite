import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SetDemoPreferenceCookieDto {
  @IsString()
  @IsIn(['light', 'dark', 'system'])
  readonly theme!: string;

  @IsString()
  @IsOptional()
  @MaxLength(16)
  readonly locale?: string;
}
