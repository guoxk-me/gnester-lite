import {
  getQueueProducerConnectionOptions,
  getQueueWorkerConnectionOptions,
  QUEUE_OPERATION_TIMEOUT_MS,
} from './queue-connection';

describe('queue connection policies', () => {
  it('bounds producer commands and recycles stalled sockets without replay', () => {
    expect(
      getQueueProducerConnectionOptions('redis://localhost:6379', false),
    ).toMatchObject({
      autoResendUnfulfilledCommands: false,
      commandTimeout: QUEUE_OPERATION_TIMEOUT_MS,
      connectTimeout: 2_000,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      socketTimeout: QUEUE_OPERATION_TIMEOUT_MS,
      url: 'redis://localhost:6379',
    });
  });

  it('keeps the BullMQ blocking worker retry contract separate', () => {
    expect(
      getQueueWorkerConnectionOptions('redis://localhost:6379'),
    ).toMatchObject({
      connectTimeout: 2_000,
      maxRetriesPerRequest: null,
      url: 'redis://localhost:6379',
    });
  });
});
