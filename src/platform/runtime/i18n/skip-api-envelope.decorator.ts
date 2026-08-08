import { SetMetadata } from '@nestjs/common';

import { SKIP_API_ENVELOPE_KEY } from './i18n.constants';

// AI modified: health probes, SSE, and binary downloads keep their native payloads.
export const SkipApiEnvelope = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_API_ENVELOPE_KEY, true);
