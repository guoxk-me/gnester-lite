import { Module } from '@nestjs/common';

import { AssistantModule } from './assistant/assistant.module.js';
import { IdentityModule } from './identity/identity.module.js';

// AI modified: current product modules have one replaceable composition boundary for the service template.
@Module({ imports: [IdentityModule, AssistantModule] })
export class ApplicationModule {}
