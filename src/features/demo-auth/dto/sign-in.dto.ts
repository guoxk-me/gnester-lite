// CN: DTO 文件，定义 demo-auth 的数据结构；EN: DTO file defines data shapes for demo-auth.
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignInDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @MinLength(8)
  password: string;
}
