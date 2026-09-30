import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// AI modified: validated request contracts belong to their business module and emit OpenAPI schemas.
export class QuestionModelBody {
  @IsIn(['deepseek', 'openai']) provider!: 'deepseek' | 'openai';
  @IsString() @Length(1, 100) modelId!: string;
}

export class SendQuestionBody {
  @IsString() @Length(1, 12000) question!: string;
  @IsOptional() @IsUUID('4') conversationId?: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => QuestionModelBody)
  model?: QuestionModelBody;
  @IsOptional() @IsBoolean() crossProviderConfirmed?: boolean;
}

export class RenameConversationBody {
  @IsString() @Length(1, 80) title!: string;
}

export class SelectAnswerBody {
  @IsUUID('4') answerId!: string;
}
