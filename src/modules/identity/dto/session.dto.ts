import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

// AI modified: validated request contracts belong to their business module and emit OpenAPI schemas.
export class SignInBody {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
