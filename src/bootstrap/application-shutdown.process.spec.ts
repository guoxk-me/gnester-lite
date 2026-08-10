import { spawn } from 'node:child_process';
import { join } from 'node:path';

interface ChildProcessResult {
  readonly exitCode: number | null;
  readonly output: string;
  readonly signal: NodeJS.Signals | null;
}

const childFixture = join(
  process.cwd(),
  'test/fixtures/application-shutdown-child.mjs',
);

describe('application shutdown process contract', () => {
  it('runs close hooks and exits 143 when SIGTERM close exceeds its deadline', async () => {
    const child = spawn(
      process.execPath,
      ['--no-warnings', childFixture, 'signal-timeout'],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let output = '';
    let hasSentSignal = false;
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      output += chunk;

      if (output.includes('READY') && !hasSentSignal) {
        hasSentSignal = true;
        child.kill('SIGTERM');
      }
    });

    const childResult = await waitForChild(child, () => output);

    expect(childResult).toEqual({
      exitCode: 143,
      output: expect.stringContaining(
        'READY\nDRAINING\nADMISSION_CLOSED\nCLOSE:SIGTERM\nTIMEOUT:SIGTERM:application\nTELEMETRY_CLOSED\n',
      ) as string,
      signal: null,
    });
  }, 5_000);

  it('closes a partially started application and exits 1 after startup rejection', async () => {
    const child = spawn(
      process.execPath,
      ['--no-warnings', childFixture, 'startup-failure'],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let output = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      output += chunk;
    });

    const childResult = await waitForChild(child, () => output);

    expect(childResult).toEqual({
      exitCode: 1,
      output: expect.stringContaining(
        'STARTUP_REJECTED\nCLOSE:none\nTELEMETRY_CLOSED\n',
      ) as string,
      signal: null,
    });
  }, 5_000);
});

function waitForChild(
  child: ReturnType<typeof spawn>,
  getOutput: () => string,
): Promise<ChildProcessResult> {
  return new Promise((resolve, reject) => {
    let errorOutput = '';
    const childErrorStream = child.stderr;
    if (!childErrorStream) {
      reject(new Error('Expected the child process stderr stream.'));
      return;
    }

    childErrorStream.setEncoding('utf8');
    childErrorStream.on('data', (chunk: string) => {
      errorOutput += chunk;
    });
    child.once('error', reject);
    child.once('exit', (exitCode, signal) => {
      if (errorOutput) {
        reject(new Error(errorOutput));
        return;
      }

      resolve({
        exitCode,
        output: getOutput(),
        signal,
      });
    });
  });
}
