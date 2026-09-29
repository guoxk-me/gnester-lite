import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { DemoUploadFileDto } from './demo-upload-file.dto.js';

@ApiExtraModels(DemoUploadFileDto)
export class DemoUploadFileFieldsDto {
  // AI modified: preserve the nested uploaded-file DTO behind dynamic field names.
  @ApiProperty({
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: { $ref: getSchemaPath(DemoUploadFileDto) },
    },
  })
  readonly fields!: Record<string, DemoUploadFileDto[]>;
}
