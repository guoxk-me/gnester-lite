import { ApiCookieAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import {
  SaveKeyBody,
  UpdateKeyBody,
  SavePreferencesBody,
  SelectModelBody,
} from './dto/configuration.dto.js';
import { SessionAuthGuard } from '../identity/session-auth.guard.js';
import { CurrentSessionUser } from '../identity/current-session-user.decorator.js';
import type { SessionUser } from '../identity/session.types.js';
import { AssistantConfigurationService } from './assistant-configuration.service.js';
import { AssistantService } from './assistant.service.js';
import type { AssistantConfigurationView } from './configuration.types.js';
import type { ConversationView } from './conversation.types.js';

// AI modified: every configuration endpoint derives ownership from the application session.
// AI modified: identity guards authenticate HTTP requests before entering assistant business logic.
@ApiCookieAuth('application-session')
@ApiUnauthorizedResponse({
  description: 'A live application session is required',
})
@UseGuards(SessionAuthGuard)
@Controller({ path: 'assistant', version: VERSION_NEUTRAL })
export class AssistantConfigurationController {
  constructor(
    private readonly assistant: AssistantService,
    private readonly configuration: AssistantConfigurationService,
  ) {}

  @Get('configuration')
  async getConfiguration(
    @CurrentSessionUser() user: SessionUser,
  ): Promise<AssistantConfigurationView> {
    return this.configuration.getConfiguration(user.id);
  }

  @Post('keys')
  @Throttle({ short: { limit: 5, ttl: 60_000 } })
  async addKey(
    @CurrentSessionUser() user: SessionUser,
    @Body() body: SaveKeyBody,
  ): Promise<AssistantConfigurationView> {
    return this.configuration.saveKey(
      user.id,
      body.provider,
      body.name,
      body.apiKey,
    );
  }

  @Put('keys/:keyId')
  @Throttle({ short: { limit: 5, ttl: 60_000 } })
  async replaceKey(
    @CurrentSessionUser() user: SessionUser,
    @Param('keyId') keyId: string,
    @Body() body: SaveKeyBody,
  ): Promise<AssistantConfigurationView> {
    return this.configuration.saveKey(
      user.id,
      body.provider,
      body.name,
      body.apiKey,
      keyId,
    );
  }

  @Patch('keys/:keyId')
  async updateKey(
    @CurrentSessionUser() user: SessionUser,
    @Param('keyId') keyId: string,
    @Body() body: UpdateKeyBody,
  ): Promise<AssistantConfigurationView> {
    return this.configuration.updateKey(user.id, keyId, body);
  }

  @Delete('keys/:keyId')
  async deleteKey(
    @CurrentSessionUser() user: SessionUser,
    @Param('keyId') keyId: string,
  ): Promise<AssistantConfigurationView> {
    return this.configuration.deleteKey(user.id, keyId);
  }

  @Post('keys/:keyId/refresh-models')
  @Throttle({ short: { limit: 10, ttl: 60_000 } })
  async refreshModels(
    @CurrentSessionUser() user: SessionUser,
    @Param('keyId') keyId: string,
  ): Promise<AssistantConfigurationView> {
    return this.configuration.refreshModels(user.id, keyId);
  }

  @Get('keys/:keyId/balance')
  async keyBalance(
    @CurrentSessionUser() user: SessionUser,
    @Param('keyId') keyId: string,
  ): ReturnType<AssistantConfigurationService['keyBalance']> {
    return this.configuration.keyBalance(user.id, keyId);
  }

  @Put('preferences')
  async savePreferences(
    @CurrentSessionUser() user: SessionUser,
    @Body() body: SavePreferencesBody,
  ): Promise<AssistantConfigurationView> {
    return this.configuration.savePreferences(
      user.id,
      body.defaultModel ?? null,
      body.backupModels,
    );
  }

  @Post('openai-consent')
  async consentToOpenAi(
    @CurrentSessionUser() user: SessionUser,
  ): Promise<{ success: boolean }> {
    await this.configuration.consentToOpenAi(user.id);
    return { success: true };
  }

  @Patch('conversations/:conversationId/model')
  async selectModel(
    @CurrentSessionUser() user: SessionUser,
    @Param('conversationId') conversationId: string,
    @Body() body: SelectModelBody,
  ): Promise<ConversationView> {
    return this.assistant.selectModel(
      user.id,
      conversationId,
      body,
      body.crossProviderConfirmed,
    );
  }
}
