import { Controller, Get, Header, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { DemoWebsocketAsyncApiService } from './demo-websocket-asyncapi.service';
import type { DemoWebsocketAsyncApiDocument } from './demo-websocket-asyncapi.service';

@ApiExcludeController()
@Controller({
  path: '',
  version: VERSION_NEUTRAL,
})
export class DemoWebsocketAsyncApiController {
  constructor(
    private readonly demoWebsocketAsyncApiService: DemoWebsocketAsyncApiService,
  ) {}

  @Get('async-api')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getIndex(): string {
    return this.demoWebsocketAsyncApiService.getIndex();
  }

  @Get('async-api-json')
  getDocument(): DemoWebsocketAsyncApiDocument {
    return this.demoWebsocketAsyncApiService.getDocument();
  }

  @Get('async-api-yaml')
  @Header('Content-Type', 'text/yaml; charset=utf-8')
  getYaml(): string {
    return this.demoWebsocketAsyncApiService.getYaml();
  }
}
