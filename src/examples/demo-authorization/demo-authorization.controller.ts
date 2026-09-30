import {
  Controller,
  Get,
  Param,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthGuard } from '../../infra/auth/auth.guard.js';
import { CurrentUser } from '../../infra/auth/decorators/current-user.decorator.js';
import { Public } from '../../infra/auth/decorators/public.decorator.js';
import type { JwtAuthenticatedUser } from '../../infra/auth/jwt-user.types.js';
import { CheckPolicies } from '../../infra/authorization/decorators/check-policies.decorator.js';
import { RequirePermissions } from '../../infra/authorization/decorators/permissions.decorator.js';
import { Roles } from '../../infra/authorization/decorators/roles.decorator.js';
import { PermissionsGuard } from '../../infra/authorization/guards/permissions.guard.js';
import { PoliciesGuard } from '../../infra/authorization/guards/policies.guard.js';
import { RolesGuard } from '../../infra/authorization/guards/roles.guard.js';
import { DemoAuthorizationService } from './demo-authorization.service.js';
import { DemoAdminReportDto } from './dto/demo-admin-report.dto.js';
import { DemoAuditLogEntryDto } from './dto/demo-audit-log-entry.dto.js';
import { DemoAuthorizationScenarioDto } from './dto/demo-authorization-scenario.dto.js';
import { DemoOwnedProfileDto } from './dto/demo-owned-profile.dto.js';

interface UserProfileParamsRequest {
  readonly params: {
    readonly userId?: string;
  };
}

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-authorization',
})
// AI modified: authenticate by default so @Public() is an explicit escape hatch.
@UseGuards(AuthGuard)
export class DemoAuthorizationController {
  constructor(
    private readonly demoAuthorizationService: DemoAuthorizationService,
  ) {}

  @Public()
  @Get('scenarios')
  getScenarios(): DemoAuthorizationScenarioDto[] {
    return this.demoAuthorizationService.getScenarios();
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOkResponse({ type: DemoAdminReportDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @Get('admin-report')
  getAdminReport(
    @CurrentUser() user: JwtAuthenticatedUser,
  ): DemoAdminReportDto {
    return this.demoAuthorizationService.getAdminReport(user);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('audit:read')
  @ApiBearerAuth()
  @ApiOkResponse({ type: DemoAuditLogEntryDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'audit:read permission required' })
  @Get('audit-log')
  getAuditLog(
    @CurrentUser() user: JwtAuthenticatedUser,
  ): DemoAuditLogEntryDto[] {
    return this.demoAuthorizationService.getAuditLog(user);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies((user, context) => {
    const request = context
      .switchToHttp()
      .getRequest<UserProfileParamsRequest>();

    return user.roles?.includes('admin') || user.sub === request.params.userId;
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: DemoOwnedProfileDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Self or admin access required' })
  @Get('users/:userId/profile')
  getUserProfile(
    @Param('userId') userId: string,
    @CurrentUser() user: JwtAuthenticatedUser,
  ): DemoOwnedProfileDto {
    return this.demoAuthorizationService.getUserProfile(userId, user);
  }
}
