import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiExtension } from '@nestjs/swagger';

import {
  SKIP_API_ENVELOPE_KEY,
  SKIP_API_ENVELOPE_OPENAPI_EXTENSION,
} from './i18n.constants';

// AI modified: one marker now drives runtime and generated OpenAPI native-response boundaries.
export const SkipApiEnvelope = (): MethodDecorator & ClassDecorator =>
  applyDecorators(
    SetMetadata(SKIP_API_ENVELOPE_KEY, true),
    ApiExtension(SKIP_API_ENVELOPE_OPENAPI_EXTENSION, true),
  );
