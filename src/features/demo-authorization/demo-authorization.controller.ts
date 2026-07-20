// CN: 控制器，定义 demo-authorization 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-authorization.
import {
  Controller,
  Get,
  Param,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';

import { AuthGuard } from '../../common/auth/auth.guard';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Public } from '../../common/auth/decorators/public.decorator';
import type { JwtAuthenticatedUser } from '../../common/auth/types/jwt-authenticated-user.type';
import { CheckPolicies } from '../../common/authorization/decorators/check-policies.decorator';
import { RequirePermissions } from '../../common/authorization/decorators/permissions.decorator';
import { Roles } from '../../common/authorization/decorators/roles.decorator';
import { PermissionsGuard } from '../../common/authorization/guards/permissions.guard';
import { PoliciesGuard } from '../../common/authorization/guards/policies.guard';
import { RolesGuard } from '../../common/authorization/guards/roles.guard';
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
export class DemoAuthorizationController {
  // CN: 初始化 demo-authorization 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-authorization.
  constructor(
    private readonly demoAuthorizationService: DemoAuthorizationService,
  ) {}

  // CN: 处理 demo-authorization 的 get scenarios HTTP 请求；EN: Handles the get scenarios HTTP request for demo-authorization.
  @Public()
  @Get('scenarios')
  getScenarios(): DemoAuthorizationScenarioDto[] {
    return this.demoAuthorizationService.getScenarios();
  }

  // CN: 处理 demo-authorization 的 get admin report HTTP 请求；EN: Handles the get admin report HTTP request for demo-authorization.
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin-report')
  getAdminReport(
    @CurrentUser() user: JwtAuthenticatedUser,
  ): DemoAdminReportDto {
    return this.demoAuthorizationService.getAdminReport(user);
  }

  // CN: 处理 demo-authorization 的 get audit log HTTP 请求；EN: Handles the get audit log HTTP request for demo-authorization.
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('audit:read')
  @Get('audit-log')
  getAuditLog(
    @CurrentUser() user: JwtAuthenticatedUser,
  ): DemoAuditLogEntryDto[] {
    return this.demoAuthorizationService.getAuditLog(user);
  }

  // CN: 处理 demo-authorization 的 get user profile HTTP 请求；EN: Handles the get user profile HTTP request for demo-authorization.
  @UseGuards(AuthGuard, PoliciesGuard)
  @CheckPolicies((user, context) => {
    const request = context
      .switchToHttp()
      .getRequest<UserProfileParamsRequest>();

    return user.roles?.includes('admin') || user.sub === request.params.userId;
  })
  @Get('users/:userId/profile')
  getUserProfile(
    @Param('userId') userId: string,
    @CurrentUser() user: JwtAuthenticatedUser,
  ): DemoOwnedProfileDto {
    return this.demoAuthorizationService.getUserProfile(userId, user);
  }
}
