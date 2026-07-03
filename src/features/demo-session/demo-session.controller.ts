// CN: 控制器，定义 demo-session 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-session.
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Session,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import type { Request } from 'express';

import { AddDemoSessionCartItemDto } from './dto/add-demo-session-cart-item.dto';
import { CreateDemoSessionFlashDto } from './dto/create-demo-session-flash.dto';
import { CreateDemoSessionLoginDto } from './dto/create-demo-session-login.dto';
import {
  DemoSessionFlashMessagesDto,
  DemoSessionStateDto,
} from './dto/demo-session-state.dto';
import { DemoSessionScenarioDto } from './dto/demo-session-scenario.dto';
import { DemoSessionService } from './demo-session.service';
import type { DemoExpressSession } from './demo-session.service';
import type { DemoSessionCartItem } from './demo-session.types';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-session',
})
export class DemoSessionController {
  // CN: 初始化 demo-session 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-session.
  constructor(private readonly demoSessionService: DemoSessionService) {}

  // CN: 处理 demo-session 的 get scenarios HTTP 请求；EN: Handles the get scenarios HTTP request for demo-session.
  @Get('scenarios')
  getScenarios(): DemoSessionScenarioDto[] {
    return this.demoSessionService.getScenarios();
  }

  // CN: 处理 demo-session 的 get status HTTP 请求；EN: Handles the get status HTTP request for demo-session.
  @Get()
  getStatus(@Session() session: DemoExpressSession): DemoSessionStateDto {
    return this.demoSessionService.getStatus(session);
  }

  // CN: 处理 demo-session 的 login HTTP 请求；EN: Handles the login HTTP request for demo-session.
  @Post('login')
  login(
    @Session() session: DemoExpressSession,
    @Body() dto: CreateDemoSessionLoginDto,
  ): DemoSessionStateDto {
    return this.demoSessionService.login(session, dto);
  }

  // CN: 处理 demo-session 的 register visit HTTP 请求；EN: Handles the register visit HTTP request for demo-session.
  @Post('visits')
  registerVisit(@Session() session: DemoExpressSession): DemoSessionStateDto {
    return this.demoSessionService.registerVisit(session);
  }

  // CN: 处理 demo-session 的 add flash message HTTP 请求；EN: Handles the add flash message HTTP request for demo-session.
  @Post('flash')
  addFlashMessage(
    @Session() session: DemoExpressSession,
    @Body() dto: CreateDemoSessionFlashDto,
  ): DemoSessionStateDto {
    return this.demoSessionService.addFlashMessage(session, dto);
  }

  // CN: 处理 demo-session 的 consume flash messages HTTP 请求；EN: Handles the consume flash messages HTTP request for demo-session.
  @Get('flash')
  consumeFlashMessages(
    @Session() session: DemoExpressSession,
  ): DemoSessionFlashMessagesDto {
    return this.demoSessionService.consumeFlashMessages(session);
  }

  // CN: 处理 demo-session 的 get cart HTTP 请求；EN: Handles the get cart HTTP request for demo-session.
  @Get('cart')
  getCart(@Session() session: DemoExpressSession): DemoSessionCartItem[] {
    return this.demoSessionService.getCart(session);
  }

  // CN: 处理 demo-session 的 add cart item HTTP 请求；EN: Handles the add cart item HTTP request for demo-session.
  @Post('cart/items')
  addCartItem(
    @Session() session: DemoExpressSession,
    @Body() dto: AddDemoSessionCartItemDto,
  ): DemoSessionStateDto {
    return this.demoSessionService.addCartItem(session, dto);
  }

  // CN: 处理 demo-session 的 remove cart item HTTP 请求；EN: Handles the remove cart item HTTP request for demo-session.
  @Delete('cart/items/:sku')
  removeCartItem(
    @Session() session: DemoExpressSession,
    @Param('sku') sku: string,
  ): DemoSessionStateDto {
    return this.demoSessionService.removeCartItem(session, sku);
  }

  // CN: 处理 demo-session 的 logout HTTP 请求；EN: Handles the logout HTTP request for demo-session.
  @Delete()
  logout(@Req() request: Request): Promise<DemoSessionStateDto> {
    return this.demoSessionService.logout(request);
  }
}
