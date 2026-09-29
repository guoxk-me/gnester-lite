import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export const DEMO_AUTH_USERNAME_MAX_LENGTH = 254;
export const DEMO_AUTH_PASSWORD_MAX_LENGTH = 128;

export class SignInDto {
  @ApiProperty({ example: 'admin@example.com', maxLength: 254 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(DEMO_AUTH_USERNAME_MAX_LENGTH)
  username!: string;

  @ApiProperty({ example: 'admin12345', minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(DEMO_AUTH_PASSWORD_MAX_LENGTH)
  password!: string;
}
