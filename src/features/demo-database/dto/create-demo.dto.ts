import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDemoDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  readonly name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  readonly description: string;
}
