import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

// AI modified: validated request contracts belong to their business module and emit OpenAPI schemas.
export class ModelChoiceBody {
  @IsIn(['deepseek', 'openai']) provider!: 'deepseek' | 'openai';
  @IsString() @Length(1, 100) modelId!: string;
}

export class SaveKeyBody {
  @IsIn(['deepseek', 'openai']) provider!: 'deepseek' | 'openai';
  @IsString() @Length(1, 80) name!: string;
  @IsString() @Length(1, 512) apiKey!: string;
}

export class UpdateKeyBody {
  @IsOptional() @IsString() @Length(1, 80) name?: string;
  @IsOptional() @IsBoolean() isEnabled?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(1000) position?: number;
}

export class SavePreferencesBody {
  @IsOptional()
  @ValidateNested()
  @Type(() => ModelChoiceBody)
  defaultModel?: ModelChoiceBody | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModelChoiceBody)
  backupModels!: ModelChoiceBody[];
}

export class SelectModelBody extends ModelChoiceBody {
  @IsOptional() @IsBoolean() crossProviderConfirmed?: boolean;
}
