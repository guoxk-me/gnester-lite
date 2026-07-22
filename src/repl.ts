import { Logger } from '@nestjs/common';
import { repl } from '@nestjs/core';

import { AppModule } from './app.module';

const logger = new Logger('Repl');

// CN: REPL 入口，初始化 DI 容器供终端交互调试；EN: REPL entry boots the DI container for interactive debugging.
async function bootstrap(): Promise<void> {
  const replServer = await repl(AppModule);
  // AI modified: keep command history across watch-mode reloads.
  replServer.setupHistory('.nestjs_repl_history', (err) => {
    if (err) {
      logger.error(err);
    }
  });
}

bootstrap().catch((err) => {
  logger.error(
    'Error during REPL bootstrap',
    err instanceof Error ? err.stack : String(err),
  );
  process.exit(1);
});
