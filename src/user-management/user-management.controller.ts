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
} from '@nestjs/common';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import type { Request, Response } from 'express';

import { CsrfService } from '../csrf/csrf.service.js';
import { UserManagementService } from './user-management.service.js';

class CreateUserBody {
  @IsString() @Length(1, 255) name!: string;
  @IsEmail() @MaxLength(255) email!: string;
  @IsString() @Length(8, 128) password!: string;
}

class UpdateNameBody {
  @IsString() @Length(1, 255) name!: string;
}

class UpdateStatusBody {
  @IsIn(['active', 'disabled']) status!: 'active' | 'disabled';
}

class BatchStatusBody extends UpdateStatusBody {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  userIds!: string[];
}

class CreateInvitationBody {
  @IsEmail() @MaxLength(255) email!: string;
}

class AcceptInvitationBody {
  @IsString() @Length(43, 43) token!: string;
  @IsString() @Length(1, 255) name!: string;
  @IsString() @Length(8, 128) password!: string;
}

class PreviewInvitationBody {
  @IsString() @Length(43, 43) token!: string;
}

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

@Controller({ path: 'admin/users', version: VERSION_NEUTRAL })
export class AdminUsersController {
  constructor(private readonly management: UserManagementService) {}

  @Get()
  async list(
    @Req() request: Request,
    @Query('search') search = '',
    @Query('status') status = 'all',
    @Query('pageIndex') pageIndex?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    await this.management.requireAdmin(request);
    const page = pageParameters(pageIndex, pageSize);
    return this.management.listUsers(search, status, page.index, page.size);
  }

  @Post()
  async create(@Req() request: Request, @Body() body: CreateUserBody) {
    await this.management.requireAdmin(request);
    return this.management.createUser(body.name, body.email, body.password);
  }

  @Patch(':userId/name')
  async updateName(
    @Req() request: Request,
    @Param('userId') userId: string,
    @Body() body: UpdateNameBody,
  ) {
    await this.management.requireAdmin(request);
    await this.management.updateName(userId, body.name);
    return { success: true };
  }

  @Patch('status')
  async batchStatus(@Req() request: Request, @Body() body: BatchStatusBody) {
    const adminId = await this.management.requireAdmin(request);
    const count = await this.management.updateStatus(
      adminId,
      body.userIds,
      body.status,
    );
    return { count };
  }

  @Patch(':userId/status')
  async status(
    @Req() request: Request,
    @Param('userId') userId: string,
    @Body() body: UpdateStatusBody,
  ) {
    const adminId = await this.management.requireAdmin(request);
    await this.management.updateStatus(adminId, [userId], body.status);
    return { success: true };
  }
}

@Controller({ path: 'admin/invitations', version: VERSION_NEUTRAL })
export class AdminInvitationsController {
  constructor(private readonly management: UserManagementService) {}

  @Get()
  async list(
    @Req() request: Request,
    @Query('search') search = '',
    @Query('status') status = 'all',
    @Query('pageIndex') pageIndex?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    await this.management.requireAdmin(request);
    const page = pageParameters(pageIndex, pageSize);
    return this.management.listInvitations(
      search,
      status,
      page.index,
      page.size,
    );
  }

  @Post()
  async create(@Req() request: Request, @Body() body: CreateInvitationBody) {
    const adminId = await this.management.requireAdmin(request);
    return this.management.createInvitation(adminId, body.email);
  }

  @Post(':invitationId/resend')
  @HttpCode(200)
  async resend(
    @Req() request: Request,
    @Param('invitationId') invitationId: string,
  ) {
    await this.management.requireAdmin(request);
    return this.management.resendInvitation(invitationId);
  }

  @Delete(':invitationId')
  async revoke(
    @Req() request: Request,
    @Param('invitationId') invitationId: string,
  ) {
    await this.management.requireAdmin(request);
    await this.management.revokeInvitation(invitationId);
    return { success: true };
  }
}

@Controller({ path: 'invitations', version: VERSION_NEUTRAL })
export class PublicInvitationsController {
  constructor(private readonly management: UserManagementService) {}

  @Post('preview')
  @HttpCode(200)
  getInvitation(@Body() body: PreviewInvitationBody) {
    // AI modified: bearer tokens stay out of server request URLs and access logs.
    return this.management.getInvitation(body.token);
  }

  @Post('accept')
  @HttpCode(200)
  async accept(@Body() body: AcceptInvitationBody) {
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
  ) {
    // AI modified: browser writes use the production CSRF boundary, including invitation acceptance.
    response.setHeader('Cache-Control', 'no-store');
    return {
      csrfToken: this.csrf.createToken(request, response),
      headerName: this.csrf.getHeaderName(),
    };
  }
}
