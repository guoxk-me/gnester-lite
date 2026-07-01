// CN: DTO 文件，定义 demo-events 的数据结构；EN: DTO file defines data shapes for demo-events.
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDemoUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  displayName: string;
}
