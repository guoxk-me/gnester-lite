import { IsNumberString } from 'class-validator';

export class FindDemoParamsDto {
  @IsNumberString()
  readonly id: string;
}
