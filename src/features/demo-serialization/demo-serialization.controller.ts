// CN: 控制器，定义 demo-serialization 的 HTTP 接口；EN: Controller defines HTTP endpoints for demo-serialization.
import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  SerializeOptions,
  UseInterceptors,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { DemoSerializationPageDto } from './dto/demo-serialization-page.dto';
import { DemoSerializationUserDto } from './dto/demo-serialization-user.dto';
import { DemoSerializationService } from './demo-serialization.service';

@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludePrefixes: ['_'] })
@Controller({
  version: VERSION_NEUTRAL,
  path: 'demo-serialization',
})
export class DemoSerializationController {
  // CN: 初始化 demo-serialization 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-serialization.
  constructor(
    private readonly demoSerializationService: DemoSerializationService,
  ) {}

  // CN: 处理 demo-serialization 的 find profile HTTP 请求；EN: Handles the find profile HTTP request for demo-serialization.
  @Get('profile')
  findProfile(): DemoSerializationUserDto {
    return this.demoSerializationService.findProfile();
  }

  // CN: 处理 demo-serialization 的 find admin profile HTTP 请求；EN: Handles the find admin profile HTTP request for demo-serialization.
  @Get('profile/admin')
  @SerializeOptions({ groups: ['admin'], excludePrefixes: ['_'] })
  findAdminProfile(): DemoSerializationUserDto {
    return this.demoSerializationService.findAdminProfile();
  }

  // CN: 处理 demo-serialization 的 find plain profile HTTP 请求；EN: Handles the find plain profile HTTP request for demo-serialization.
  @Get('profile/plain')
  @SerializeOptions({
    type: DemoSerializationUserDto,
    excludePrefixes: ['_'],
  })
  findPlainProfile(): Record<string, unknown> {
    return this.demoSerializationService.findPlainProfile();
  }

  // CN: 处理 demo-serialization 的 find plain page HTTP 请求；EN: Handles the find plain page HTTP request for demo-serialization.
  @Get('page/plain')
  @SerializeOptions({
    type: DemoSerializationPageDto,
    excludePrefixes: ['_'],
  })
  findPlainPage(): Record<string, unknown> {
    return this.demoSerializationService.findPlainPage();
  }
}
