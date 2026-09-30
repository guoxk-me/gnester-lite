import { ApiCookieAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';

import {
  SendQuestionBody,
  RenameConversationBody,
  SelectAnswerBody,
} from './dto/conversation.dto.js';
import { SessionAuthGuard } from '../identity/session-auth.guard.js';
import { CurrentSessionUser } from '../identity/current-session-user.decorator.js';
import type { SessionUser } from '../identity/session.types.js';
import { AssistantService } from './assistant.service.js';
import type {
  ConversationSummary,
  ConversationView,
} from './conversation.types.js';

// AI modified: identity guards authenticate HTTP requests before entering assistant business logic.
@ApiCookieAuth('application-session')
@ApiUnauthorizedResponse({
  description: 'A live application session is required',
})
@UseGuards(SessionAuthGuard)
@Controller({ path: 'assistant', version: VERSION_NEUTRAL })
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Get('conversations')
  async list(
    @CurrentSessionUser() user: SessionUser,
  ): Promise<ConversationSummary[]> {
    return this.assistant.listConversations(user.id);
  }

  @Get('conversations/:conversationId')
  async get(
    @CurrentSessionUser() user: SessionUser,
    @Param('conversationId') conversationId: string,
  ): Promise<ConversationView> {
    return this.assistant.getConversation(user.id, conversationId);
  }

  @Post('questions')
  async send(
    @CurrentSessionUser() user: SessionUser,
    @Body() body: SendQuestionBody,
  ): Promise<ConversationView> {
    return this.assistant.sendQuestion(
      user.id,
      body.question,
      body.conversationId,
      body.model,
      body.crossProviderConfirmed,
    );
  }

  @Post('turns/:turnId/regenerate')
  @HttpCode(200)
  async regenerate(
    @CurrentSessionUser() user: SessionUser,
    @Param('turnId') turnId: string,
  ): Promise<ConversationView> {
    return this.assistant.regenerate(user.id, turnId);
  }

  @Patch('turns/:turnId/selected-answer')
  async selectAnswer(
    @CurrentSessionUser() user: SessionUser,
    @Param('turnId') turnId: string,
    @Body() body: SelectAnswerBody,
  ): Promise<ConversationView> {
    return this.assistant.selectAnswer(user.id, turnId, body.answerId);
  }

  @Post('answers/:answerId/stop')
  @HttpCode(200)
  async stop(
    @CurrentSessionUser() user: SessionUser,
    @Param('answerId') answerId: string,
  ): Promise<ConversationView> {
    return this.assistant.stopAnswer(user.id, answerId);
  }

  @Patch('conversations/:conversationId')
  async rename(
    @CurrentSessionUser() user: SessionUser,
    @Param('conversationId') conversationId: string,
    @Body() body: RenameConversationBody,
  ): Promise<{ success: boolean }> {
    await this.assistant.renameConversation(
      user.id,
      conversationId,
      body.title,
    );
    return { success: true };
  }

  @Delete('conversations/:conversationId')
  async remove(
    @CurrentSessionUser() user: SessionUser,
    @Param('conversationId') conversationId: string,
  ): Promise<{ success: boolean }> {
    await this.assistant.deleteConversation(user.id, conversationId);
    return { success: true };
  }
}
