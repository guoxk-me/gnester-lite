import { writeSync } from 'node:fs';

import {
  registerApplicationShutdownHandlers,
  reportStartupFailureAndShutdown,
} from '../../src/bootstrap/application-shutdown.ts';

const mode = process.argv[2];
const application = {
  close(signal) {
    writeSync(1, `CLOSE:${signal ?? 'none'}\n`);

    return mode === 'signal-timeout'
      ? new Promise(() => undefined)
      : Promise.resolve();
  },
};
const shutdown = registerApplicationShutdownHandlers({
  getApplication: () => application,
  getBudgets: () => ({
    readinessPropagationDelayMs: 0,
    applicationCloseTimeoutMs: 25,
    telemetryCloseTimeoutMs: 10,
  }),
  isAcceptingRequests: () => mode !== 'startup-failure',
  beginDrain: () => {
    writeSync(1, 'DRAINING\n');
  },
  stopAcceptingRequests: () => {
    writeSync(1, 'ADMISSION_CLOSED\n');
    return Promise.resolve();
  },
  closeTelemetry: () => {
    writeSync(1, 'TELEMETRY_CLOSED\n');
    return Promise.resolve('closed');
  },
  onShutdownError: (error, reason, phase) => {
    writeSync(1, `ERROR:${reason}:${phase}:${String(error)}\n`);
  },
  onShutdownTimeout: (reason, phase) => {
    writeSync(1, `TIMEOUT:${reason}:${phase}\n`);
  },
  processTarget: process,
});

if (mode === 'startup-failure') {
  await reportStartupFailureAndShutdown(
    () => {
      writeSync(1, 'STARTUP_REJECTED\n');
      throw new Error('startup logger failed');
    },
    () => shutdown.shutdownApplication(1, 'failed bootstrap'),
  );
} else {
  writeSync(1, 'READY\n');
  setInterval(() => undefined, 1_000);
}
