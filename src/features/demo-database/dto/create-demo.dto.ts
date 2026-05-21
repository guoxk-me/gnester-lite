import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDemoDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  readonly name: string;

  @IsNotEmpty()
  @IsString()
  readonly description: string;
}
