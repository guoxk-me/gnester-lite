// CN: 测试文件，验证 demo-queue 的行为契约；EN: Test file verifies behavior contracts for demo-queue.
import { Job } from 'bullmq';
import { DEMO_QUEUE_SEND_EMAIL_JOB } from './demo-queue.constants';
import { DemoQueueProcessor } from './demo-queue.processor';
import { DemoEmailJobData } from './demo-queue.types';
import { DemoQueueResultDto } from './dto/demo-queue-result.dto';

// CN: 测试分组：DemoQueueProcessor；EN: Test group: DemoQueueProcessor.
describe('DemoQueueProcessor', () => {
  let processor: DemoQueueProcessor;

  // CN: 测试准备，组织或验证测试流程；EN: Test setup organizes or verifies the test flow.
  beforeEach(() => {
    processor = new DemoQueueProcessor();
  });

  // CN: 测试用例：marks demo email jobs complete after updating progress；EN: Test case: marks demo email jobs complete after updating progress.
  it('marks demo email jobs complete after updating progress', async () => {
    const updateProgress = jest.fn().mockResolvedValue(undefined);
    const job = {
      name: DEMO_QUEUE_SEND_EMAIL_JOB,
      data: {
        to: 'user@example.com',
        subject: 'Welcome',
        requestedAt: '2026-05-28T00:00:00.000Z',
      },
      updateProgress,
    } as unknown as Job<DemoEmailJobData, DemoQueueResultDto, string>;

    await expect(processor.process(job)).resolves.toEqual({
      delivered: true,
      handledAt: expect.any(String) as string,
    });
    expect(updateProgress).toHaveBeenCalledWith(100);
  });

  // CN: 测试用例：rejects unknown job names instead of silently dropping work；EN: Test case: rejects unknown job names instead of silently dropping work.
  it('rejects unknown job names instead of silently dropping work', async () => {
    const job = {
      name: 'unknown',
      data: {
        to: 'user@example.com',
        subject: 'Welcome',
        requestedAt: '2026-05-28T00:00:00.000Z',
      },
      updateProgress: jest.fn(),
    } as unknown as Job<DemoEmailJobData, DemoQueueResultDto, string>;

    await expect(processor.process(job)).rejects.toThrow(
      'Unsupported demo queue job "unknown"',
    );
  });
});
