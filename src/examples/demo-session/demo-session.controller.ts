import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Req,
  Session,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  ApiParam,
  ApiOkResponse,
  ApiResponse,
  type ApiResponseOptions,
} from '@nestjs/swagger';
import type { Request } from 'express';

import {
  AddDemoSessionCartItemDto,
  DEMO_SESSION_SKU_MAX_LENGTH,
} from './dto/add-demo-session-cart-item.dto';
import { CreateDemoSessionFlashDto } from './dto/create-demo-session-flash.dto';
import { CreateDemoSessionLoginDto } from './dto/create-demo-session-login.dto';
import { DemoSessionCartItemDto } from './dto/demo-session-cart-item.dto';
import { DemoSessionCartItemParamsDto } from './dto/demo-session-cart-item-params.dto';
import {
  DemoSessionFlashMessagesDto,
  DemoSessionStateDto,
} from './dto/demo-session-state.dto';
import { DemoSessionScenarioDto } from './dto/demo-session-scenario.dto';
import { DemoSessionService } from './demo-session.service';
import type { DemoExpressSession } from './demo-session.service';

// AI modified: every stateful session route fails closed when middleware is absent.
const demoSessionUnavailableResponse: ApiResponseOptions = {
  status: 503,
  description: 'Session middleware is not enabled',
};
const demoSessionCapacityResponse: ApiResponseOptions = {
  status: 409,
  description: 'The bounded session flash queue or cart is already full',
};

@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-session',
})
export class DemoSessionController {
  constructor(private readonly demoSessionService: DemoSessionService) {}

  @Get('scenarios')
  getScenarios(): DemoSessionScenarioDto[] {
    return this.demoSessionService.getScenarios();
  }

  @Get()
  // AI modified: prevent shared caches from storing cookie-bound session state.
  @Header('Cache-Control', 'private, no-store')
  @ApiResponse(demoSessionUnavailableResponse)
  @ApiResponse({
    status: 200,
    type: DemoSessionStateDto,
    headers: {
      'Cache-Control': {
        description: 'Prevents caches from retaining browser session state',
        schema: { type: 'string', example: 'private, no-store' },
      },
    },
  })
  getStatus(@Session() session: DemoExpressSession): DemoSessionStateDto {
    return this.demoSessionService.getStatus(session);
  }

  @Post('login')
  @ApiResponse({
    status: 400,
    description: 'Session login input failed validation',
  })
  @ApiResponse(demoSessionUnavailableResponse)
  @ApiResponse({ status: 201, type: DemoSessionStateDto })
  login(
    @Req() request: Request,
    @Body() dto: CreateDemoSessionLoginDto,
  ): Promise<DemoSessionStateDto> {
    return this.demoSessionService.login(request, dto);
  }

  @Post('visits')
  @ApiResponse(demoSessionUnavailableResponse)
  @ApiResponse({ status: 201, type: DemoSessionStateDto })
  registerVisit(@Session() session: DemoExpressSession): DemoSessionStateDto {
    return this.demoSessionService.registerVisit(session);
  }

  @Post('flash')
  @ApiResponse({
    status: 400,
    description: 'Flash message input failed validation',
  })
  @ApiResponse(demoSessionCapacityResponse)
  @ApiResponse(demoSessionUnavailableResponse)
  @ApiResponse({ status: 201, type: DemoSessionStateDto })
  addFlashMessage(
    @Session() session: DemoExpressSession,
    @Body() dto: CreateDemoSessionFlashDto,
  ): DemoSessionStateDto {
    return this.demoSessionService.addFlashMessage(session, dto);
  }

  @Get('flash')
  // AI modified: consumed cookie-bound messages must not be cached or replayed.
  @Header('Cache-Control', 'private, no-store')
  @ApiResponse(demoSessionUnavailableResponse)
  @ApiResponse({
    status: 200,
    type: DemoSessionFlashMessagesDto,
    headers: {
      'Cache-Control': {
        description: 'Prevents caches from replaying consumed flash messages',
        schema: { type: 'string', example: 'private, no-store' },
      },
    },
  })
  consumeFlashMessages(
    @Session() session: DemoExpressSession,
  ): DemoSessionFlashMessagesDto {
    return this.demoSessionService.consumeFlashMessages(session);
  }

  @Get('cart')
  // AI modified: prevent shared caches from storing a browser session cart.
  @Header('Cache-Control', 'private, no-store')
  @ApiResponse(demoSessionUnavailableResponse)
  @ApiOkResponse({
    type: [DemoSessionCartItemDto],
    headers: {
      'Cache-Control': {
        description: 'Prevents caches from retaining the browser session cart',
        schema: { type: 'string', example: 'private, no-store' },
      },
    },
  })
  getCart(@Session() session: DemoExpressSession): DemoSessionCartItemDto[] {
    return this.demoSessionService.getCart(session);
  }

  @Post('cart/items')
  @ApiResponse({
    status: 400,
    description: 'Cart SKU, name, or quantity failed validation',
  })
  @ApiResponse(demoSessionCapacityResponse)
  @ApiResponse(demoSessionUnavailableResponse)
  @ApiResponse({ status: 201, type: DemoSessionStateDto })
  addCartItem(
    @Session() session: DemoExpressSession,
    @Body() dto: AddDemoSessionCartItemDto,
  ): DemoSessionStateDto {
    return this.demoSessionService.addCartItem(session, dto);
  }

  @Delete('cart/items/:sku')
  @ApiResponse({
    status: 400,
    description: 'Cart SKU path parameter failed validation',
  })
  @ApiResponse(demoSessionUnavailableResponse)
  @ApiResponse({ status: 200, type: DemoSessionStateDto })
  @ApiParam({
    name: 'sku',
    schema: {
      type: 'string',
      minLength: 1,
      maxLength: DEMO_SESSION_SKU_MAX_LENGTH,
      pattern: '^[a-zA-Z0-9:_-]+$',
    },
  })
  removeCartItem(
    @Session() session: DemoExpressSession,
    @Param() params: DemoSessionCartItemParamsDto,
  ): DemoSessionStateDto {
    // AI modified: deletion uses the same SKU grammar as cart insertion.
    return this.demoSessionService.removeCartItem(session, params.sku);
  }

  @Delete()
  @ApiResponse(demoSessionUnavailableResponse)
  @ApiResponse({ status: 200, type: DemoSessionStateDto })
  logout(@Req() request: Request): Promise<DemoSessionStateDto> {
    return this.demoSessionService.logout(request);
  }
}
