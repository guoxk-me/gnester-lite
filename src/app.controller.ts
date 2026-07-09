import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

// CN: 根控制器提供基础首页接口；EN: Root controller exposes the basic home endpoint.
@Controller()
export class AppController {
  // CN: 初始化 root app 的控制器依赖；EN: Initializes controller dependencies for root app.
  constructor(private readonly appService: AppService) {}

  // CN: 处理 root app 的 get hello HTTP 请求；EN: Handles the get hello HTTP request for root app.
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
