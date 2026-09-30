import {
  IsArray,
  IsEmail,
  IsIn,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';

// AI modified: validated request contracts belong to their business module and emit OpenAPI schemas.
export class CreateUserBody {
  @IsString() @Length(1, 255) name!: string;
  @IsEmail() @MaxLength(255) email!: string;
  @IsString() @Length(8, 128) password!: string;
}

export class UpdateNameBody {
  @IsString() @Length(1, 255) name!: string;
}

export class UpdateStatusBody {
  @IsIn(['active', 'disabled']) status!: 'active' | 'disabled';
}

export class BatchStatusBody extends UpdateStatusBody {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  userIds!: string[];
}

export class CreateInvitationBody {
  @IsEmail() @MaxLength(255) email!: string;
}

export class AcceptInvitationBody {
  @IsString() @Length(43, 43) token!: string;
  @IsString() @Length(1, 255) name!: string;
  @IsString() @Length(8, 128) password!: string;
}

export class PreviewInvitationBody {
  @IsString() @Length(43, 43) token!: string;
}
