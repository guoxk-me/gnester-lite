// CN: 测试文件，验证 demo-queue 的行为契约；EN: Test file verifies behavior contracts for demo-queue.
import { Job } from 'bullmq';
import {
  DEMO_QUEUE_LONG_TASK_JOB,
  DEMO_QUEUE_SEND_EMAIL_JOB,
  DEMO_QUEUE_SUBTASK_JOB,
  DEMO_QUEUE_WORKFLOW_JOB,
} from './demo-queue.constants';
import { DemoQueueProcessor } from './demo-queue.processor';
import {
  DemoEmailJobData,
  DemoLongTaskJobData,
  DemoQueueJobData,
  DemoSubtaskJobData,
  DemoWorkflowJobData,
} from './demo-queue.types';
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

  // CN: 测试用例：reports progress while simulated long jobs run；EN: Test case: reports progress while simulated long jobs run.
  it('reports progress while simulated long jobs run', async () => {
    const updateProgress = jest.fn().mockResolvedValue(undefined);
    const job = {
      name: DEMO_QUEUE_LONG_TASK_JOB,
      data: {
        taskName: 'monthly-report',
        durationMs: 3,
        steps: 3,
        requestedAt: '2026-05-28T00:00:00.000Z',
      },
      updateProgress,
    } as unknown as Job<DemoLongTaskJobData, DemoQueueResultDto, string>;

    await expect(processor.process(job)).resolves.toEqual({
      completed: true,
      handledAt: expect.any(String) as string,
    });
    expect(updateProgress).toHaveBeenNthCalledWith(1, 33);
    expect(updateProgress).toHaveBeenNthCalledWith(2, 67);
    expect(updateProgress).toHaveBeenNthCalledWith(3, 100);
  });

  // CN: 测试用例：handles workflow child jobs independently；EN: Test case: handles workflow child jobs independently.
  it('handles workflow child jobs independently', async () => {
    const updateProgress = jest.fn().mockResolvedValue(undefined);
    const job = {
      name: DEMO_QUEUE_SUBTASK_JOB,
      data: {
        workflowName: 'onboarding',
        subtaskName: 'send-welcome-email',
        durationMs: 1,
        requestedAt: '2026-05-28T00:00:00.000Z',
      },
      updateProgress,
    } as unknown as Job<DemoSubtaskJobData, DemoQueueResultDto, string>;

    await expect(processor.process(job)).resolves.toEqual({
      completed: true,
      handledAt: expect.any(String) as string,
    });
    expect(updateProgress).toHaveBeenNthCalledWith(1, 50);
    expect(updateProgress).toHaveBeenNthCalledWith(2, 100);
  });

  // CN: 测试用例：completes workflow parent jobs after children finish；EN: Test case: completes workflow parent jobs after children finish.
  it('completes workflow parent jobs after children finish', async () => {
    const updateProgress = jest.fn().mockResolvedValue(undefined);
    const job = {
      name: DEMO_QUEUE_WORKFLOW_JOB,
      data: {
        workflowName: 'onboarding',
        requestedAt: '2026-05-28T00:00:00.000Z',
      },
      updateProgress,
    } as unknown as Job<DemoWorkflowJobData, DemoQueueResultDto, string>;

    await expect(processor.process(job)).resolves.toEqual({
      workflowCompleted: true,
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
    } as unknown as Job<DemoQueueJobData, DemoQueueResultDto, string>;

    await expect(processor.process(job)).rejects.toThrow(
      'Unsupported demo queue job "unknown"',
    );
  });
});
