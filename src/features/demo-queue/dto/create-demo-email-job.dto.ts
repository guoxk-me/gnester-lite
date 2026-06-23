// CN: DTO 文件，定义 demo-queue 的数据结构；EN: DTO file defines data shapes for demo-queue.
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDemoEmailJobDto {
  @IsEmail()
  to: string;

  @IsString()
  @MaxLength(120)
  subject: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  body?: string;
}
