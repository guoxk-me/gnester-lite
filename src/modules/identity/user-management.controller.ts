import {
  ApiCookieAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  VERSION_NEUTRAL,
  UseGuards,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import {
  CreateUserBody,
  UpdateNameBody,
  UpdateStatusBody,
  BatchStatusBody,
  CreateInvitationBody,
  AcceptInvitationBody,
  PreviewInvitationBody,
} from './dto/user-management.dto.js';
import { CsrfService } from '../../infra/csrf/csrf.service.js';
import { UserManagementService } from './user-management.service.js';
import { SessionAuthGuard } from './session-auth.guard.js';
import { IdentityAdminGuard } from './identity-admin.guard.js';
import { CurrentSessionUser } from './current-session-user.decorator.js';
import type { SessionUser } from './session.types.js';
import type { UserRecord } from './user.types.js';
import type { InvitationRecord } from './invitation.types.js';

function pageParameters(
  pageIndex?: string,
  pageSize?: string,
): { index: number; size: number } {
  const index = Number(pageIndex ?? 0);
  const size = Number(pageSize ?? 20);
  if (
    !Number.isSafeInteger(index) ||
    index < 0 ||
    !Number.isSafeInteger(size) ||
    size < 1 ||
    size > 100
  ) {
    throw new BadRequestException('Invalid pagination');
  }
  return { index, size };
}

// AI modified: checked session and admin role belong to the HTTP identity boundary.
@ApiCookieAuth('application-session')
@ApiUnauthorizedResponse({
  description: 'A live application session is required',
})
@ApiForbiddenResponse({
  description: 'The current account must be an administrator',
})
@UseGuards(SessionAuthGuard, IdentityAdminGuard)
@Controller({ path: 'admin/users', version: VERSION_NEUTRAL })
export class AdminUsersController {
  constructor(private readonly management: UserManagementService) {}

  @Get()
  async list(
    @Query('search') search = '',
    @Query('status') status = 'all',
    @Query('pageIndex') pageIndex?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<{ rows: UserRecord[]; total: number }> {
    const page = pageParameters(pageIndex, pageSize);
    return this.management.listUsers(search, status, page.index, page.size);
  }

  @Post()
  async create(@Body() body: CreateUserBody): Promise<UserRecord> {
    return this.management.createUser(body.name, body.email, body.password);
  }

  @Patch(':userId/name')
  async updateName(
    @Param('userId') userId: string,
    @Body() body: UpdateNameBody,
  ): Promise<{ success: boolean }> {
    await this.management.updateName(userId, body.name);
    return { success: true };
  }

  @Patch('status')
  async batchStatus(
    @CurrentSessionUser() user: SessionUser,
    @Body() body: BatchStatusBody,
  ): Promise<{ count: number }> {
    const adminId = user.id;
    const count = await this.management.updateStatus(
      adminId,
      body.userIds,
      body.status,
    );
    return { count };
  }

  @Patch(':userId/status')
  async status(
    @CurrentSessionUser() user: SessionUser,
    @Param('userId') userId: string,
    @Body() body: UpdateStatusBody,
  ): Promise<{ success: boolean }> {
    const adminId = user.id;
    await this.management.updateStatus(adminId, [userId], body.status);
    return { success: true };
  }
}

// AI modified: checked session and admin role belong to the HTTP identity boundary.
@ApiCookieAuth('application-session')
@ApiUnauthorizedResponse({
  description: 'A live application session is required',
})
@ApiForbiddenResponse({
  description: 'The current account must be an administrator',
})
@UseGuards(SessionAuthGuard, IdentityAdminGuard)
@Controller({ path: 'admin/invitations', version: VERSION_NEUTRAL })
export class AdminInvitationsController {
  constructor(private readonly management: UserManagementService) {}

  @Get()
  async list(
    @Query('search') search = '',
    @Query('status') status = 'all',
    @Query('pageIndex') pageIndex?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<{ rows: InvitationRecord[]; total: number }> {
    const page = pageParameters(pageIndex, pageSize);
    return this.management.listInvitations(
      search,
      status,
      page.index,
      page.size,
    );
  }

  @Post()
  async create(
    @CurrentSessionUser() user: SessionUser,
    @Body() body: CreateInvitationBody,
  ): ReturnType<UserManagementService['createInvitation']> {
    const adminId = user.id;
    return this.management.createInvitation(adminId, body.email);
  }

  @Post(':invitationId/resend')
  @HttpCode(200)
  async resend(
    @Param('invitationId') invitationId: string,
  ): ReturnType<UserManagementService['resendInvitation']> {
    return this.management.resendInvitation(invitationId);
  }

  @Delete(':invitationId')
  async revoke(
    @Param('invitationId') invitationId: string,
  ): Promise<{ success: boolean }> {
    await this.management.revokeInvitation(invitationId);
    return { success: true };
  }
}

@Controller({ path: 'invitations', version: VERSION_NEUTRAL })
export class PublicInvitationsController {
  constructor(private readonly management: UserManagementService) {}

  @Post('preview')
  @HttpCode(200)
  getInvitation(
    @Body() body: PreviewInvitationBody,
  ): Promise<{ email: string; expiresAt: string }> {
    // AI modified: bearer tokens stay out of server request URLs and access logs.
    return this.management.getInvitation(body.token);
  }

  @Post('accept')
  @HttpCode(200)
  async accept(
    @Body() body: AcceptInvitationBody,
  ): Promise<{ success: boolean }> {
    await this.management.acceptInvitation(
      body.token,
      body.name,
      body.password,
    );
    return { success: true };
  }
}

@Controller({ path: 'security', version: VERSION_NEUTRAL })
export class SecurityTokenController {
  constructor(private readonly csrf: CsrfService) {}

  @Get('csrf-token')
  getToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): { csrfToken: string; headerName: string } {
    // AI modified: browser writes use the production CSRF boundary, including invitation acceptance.
    response.setHeader('Cache-Control', 'no-store');
    return {
      csrfToken: this.csrf.createToken(request, response),
      headerName: this.csrf.getHeaderName(),
    };
  }
}
