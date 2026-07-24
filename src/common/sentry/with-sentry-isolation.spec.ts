// CN: 测试文件，验证 with-sentry-isolation 的行为契约；EN: Test file verifies behavior contracts for with-sentry-isolation.
import * as Sentry from '@sentry/nestjs';
import { withSentryIsolation } from './with-sentry-isolation';

jest.mock('@sentry/nestjs', () => ({
  withIsolationScope: jest.fn(<T>(callback: () => T): T => callback()),
}));

describe('withSentryIsolation', () => {
  it('delegates work to Sentry.withIsolationScope', () => {
    const result = withSentryIsolation(() => 'isolated');

    expect(Sentry.withIsolationScope).toHaveBeenCalledTimes(1);
    expect(result).toBe('isolated');
  });
});
