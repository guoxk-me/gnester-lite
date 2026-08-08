import { SetMetadata } from '@nestjs/common';

export const SKIP_HTTP_THROTTLE_KEY = 'gnester:rate-limit:skip-http';

// AI modified: one marker skips every configured HTTP budget without naming them.
export const SkipHttpThrottle = (): ClassDecorator & MethodDecorator =>
  SetMetadata(SKIP_HTTP_THROTTLE_KEY, true);
