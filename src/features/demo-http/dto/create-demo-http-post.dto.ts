// CN: DTO 文件，定义 demo-http 的数据结构；EN: DTO file defines data shapes for demo-http.
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateDemoHttpPostDto {
  @IsInt()
  @Min(1)
  readonly userId: number;

  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @IsString()
  @IsNotEmpty()
  readonly body: string;
}
