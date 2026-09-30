import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AssistantService } from './assistant.service.js';
import { AssistantProviderService } from './assistant-provider.service.js';
import { AssistantModelSyncService } from './assistant-model-sync.service.js';
import { IdentityModule } from '../identity/identity.module.js';
import { CryptoModule } from '../../infra/crypto/crypto.module.js';
import { QueueModule } from '../../infra/queue/queue.module.js';
import { ScheduleModule } from '../../infra/schedule/schedule.module.js';
import { AssistantConfigurationController } from './assistant-configuration.controller.js';
import { AssistantConfigurationService } from './assistant-configuration.service.js';
import { AssistantController } from './assistant.controller.js';
import { AssistantProcessor } from './assistant.processor.js';
import {
  ASSISTANT_QUEUE,
  AssistantCancellation,
  AssistantGenerationService,
} from './assistant-generation.service.js';

// AI modified: the assistant owns its authenticated API, durable history, and generation worker.
@Module({
  imports: [
    IdentityModule,
    CryptoModule,
    QueueModule,
    ScheduleModule,
    BullModule.registerQueue({ name: ASSISTANT_QUEUE }),
  ],
  controllers: [AssistantController, AssistantConfigurationController],
  providers: [
    AssistantService,
    AssistantGenerationService,
    AssistantProviderService,
    AssistantModelSyncService,
    AssistantConfigurationService,
    AssistantCancellation,
    AssistantProcessor,
  ],
})
export class AssistantModule {}
