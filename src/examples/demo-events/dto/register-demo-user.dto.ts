import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { MAX_EMAIL_ADDRESS_LENGTH } from '../../../contracts/input-validation.constants';

export class RegisterDemoUserDto {
  // AI modified: bound event payload identity fields before they enter the in-process bus.
  @ApiProperty({
    example: 'user@example.com',
    format: 'email',
    maxLength: MAX_EMAIL_ADDRESS_LENGTH,
  })
  @IsEmail()
  @MaxLength(MAX_EMAIL_ADDRESS_LENGTH)
  email!: string;

  @ApiProperty({
    minLength: 2,
    maxLength: 40,
    pattern: '\\S',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/\S/)
  displayName!: string;
}
