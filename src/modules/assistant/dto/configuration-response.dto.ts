import { ApiProperty } from '@nestjs/swagger';
import { ModelChoiceBody } from './configuration.dto.js';
import type { AssistantProvider } from '../model.types.js';
import type { AssistantModelView } from '../configuration.types.js';

// AI modified: runtime response schemas expose personal controls to the generated frontend contract.
export class AssistantKeyResponse {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ['deepseek', 'openai'] }) provider!: AssistantProvider;
  @ApiProperty() name!: string;
  @ApiProperty() isEnabled!: boolean;
  @ApiProperty() position!: number;
  @ApiProperty({ type: String, nullable: true }) lastErrorCode!: string | null;
  @ApiProperty() updatedAt!: string;
  @ApiProperty({ type: String, nullable: true }) lastSyncedAt!: string | null;
}

export class AssistantModelResponse extends ModelChoiceBody {
  @ApiProperty() isEnabled!: boolean;
  @ApiProperty() isAvailable!: boolean;
  @ApiProperty({
    type: String,
    nullable: true,
    enum: [
      'unavailable',
      'pending_compatibility',
      'retired',
      'quota_exhausted',
      'key_invalid',
      'disabled',
    ],
  })
  reason!: AssistantModelView['reason'];
}

export class AssistantModelNoticeResponse {
  @ApiProperty({ type: ModelChoiceBody }) previous!: ModelChoiceBody;
  @ApiProperty({ type: ModelChoiceBody, nullable: true })
  replacement!: ModelChoiceBody | null;
}

export class AssistantConfigurationResponse {
  @ApiProperty({ type: [AssistantKeyResponse] }) keys!: AssistantKeyResponse[];
  @ApiProperty({ type: [AssistantModelResponse] })
  models!: AssistantModelResponse[];
  @ApiProperty({ type: ModelChoiceBody, nullable: true })
  defaultModel!: ModelChoiceBody | null;
  @ApiProperty({ type: [ModelChoiceBody] }) backupModels!: ModelChoiceBody[];
  @ApiProperty() hasOpenAiConsent!: boolean;
  @ApiProperty({ type: String, nullable: true }) updatedAt!: string | null;
  @ApiProperty({ type: AssistantModelNoticeResponse, nullable: true })
  modelNotice!: AssistantModelNoticeResponse | null;
}
