import {
  ApiCookieAuth,
  ApiUnauthorizedResponse,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
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
  UpdateModelBody,
} from './dto/configuration.dto.js';
import { SessionAuthGuard } from '../identity/session-auth.guard.js';
import { CurrentSessionUser } from '../identity/current-session-user.decorator.js';
import type { SessionUser } from '../identity/session.types.js';
import { AssistantConfigurationService } from './assistant-configuration.service.js';
import { AssistantService } from './assistant.service.js';
import { AssistantConfigurationResponse } from './dto/configuration-response.dto.js';
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
  @ApiOkResponse({ type: AssistantConfigurationResponse })
  async getConfiguration(
    @CurrentSessionUser() user: SessionUser,
  ): Promise<AssistantConfigurationView> {
    return this.configuration.getConfiguration(user.id);
  }

  @Post('keys')
  @ApiCreatedResponse({ type: AssistantConfigurationResponse })
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
  @ApiOkResponse({ type: AssistantConfigurationResponse })
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
  @ApiOkResponse({ type: AssistantConfigurationResponse })
  async updateKey(
    @CurrentSessionUser() user: SessionUser,
    @Param('keyId') keyId: string,
    @Body() body: UpdateKeyBody,
  ): Promise<AssistantConfigurationView> {
    return this.configuration.updateKey(user.id, keyId, body);
  }

  @Delete('keys/:keyId')
  @ApiOkResponse({ type: AssistantConfigurationResponse })
  async deleteKey(
    @CurrentSessionUser() user: SessionUser,
    @Param('keyId') keyId: string,
  ): Promise<AssistantConfigurationView> {
    return this.configuration.deleteKey(user.id, keyId);
  }

  // AI modified: model preferences and emergency revocation pass the same session and account boundary as other configuration writes.
  @Patch('models')
  @ApiOkResponse({ type: AssistantConfigurationResponse })
  async updateModel(
    @CurrentSessionUser() user: SessionUser,
    @Body() body: UpdateModelBody,
  ): Promise<AssistantConfigurationView> {
    return this.configuration.updateModel(user.id, body);
  }

  @Post('keys/:keyId/revoke')
  @ApiCreatedResponse({ type: AssistantConfigurationResponse })
  async revokeKey(
    @CurrentSessionUser() user: SessionUser,
    @Param('keyId') keyId: string,
  ): Promise<AssistantConfigurationView> {
    return this.configuration.revokeKey(user.id, keyId);
  }

  @Post('keys/:keyId/refresh-models')
  @ApiCreatedResponse({ type: AssistantConfigurationResponse })
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
  @ApiOkResponse({ type: AssistantConfigurationResponse })
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
