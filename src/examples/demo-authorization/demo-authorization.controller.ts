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

import { AuthGuard } from '../../platform/security/auth/auth.guard';
import { CurrentUser } from '../../platform/security/auth/decorators/current-user.decorator';
import { Public } from '../../platform/security/auth/decorators/public.decorator';
import type { JwtAuthenticatedUser } from '../../platform/security/auth/types/jwt-authenticated-user.type';
import { CheckPolicies } from '../../platform/security/authorization/decorators/check-policies.decorator';
import { RequirePermissions } from '../../platform/security/authorization/decorators/permissions.decorator';
import { Roles } from '../../platform/security/authorization/decorators/roles.decorator';
import { PermissionsGuard } from '../../platform/security/authorization/guards/permissions.guard';
import { PoliciesGuard } from '../../platform/security/authorization/guards/policies.guard';
import { RolesGuard } from '../../platform/security/authorization/guards/roles.guard';
import { DemoAuthorizationService } from './demo-authorization.service';
import { DemoAdminReportDto } from './dto/demo-admin-report.dto';
import { DemoAuditLogEntryDto } from './dto/demo-audit-log-entry.dto';
import { DemoAuthorizationScenarioDto } from './dto/demo-authorization-scenario.dto';
import { DemoOwnedProfileDto } from './dto/demo-owned-profile.dto';

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
