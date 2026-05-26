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
  constructor(
    private readonly demoSerializationService: DemoSerializationService,
  ) {}

  @Get('profile')
  findProfile(): DemoSerializationUserDto {
    return this.demoSerializationService.findProfile();
  }

  @Get('profile/admin')
  @SerializeOptions({ groups: ['admin'], excludePrefixes: ['_'] })
  findAdminProfile(): DemoSerializationUserDto {
    return this.demoSerializationService.findAdminProfile();
  }

  @Get('profile/plain')
  @SerializeOptions({
    type: DemoSerializationUserDto,
    excludePrefixes: ['_'],
  })
  findPlainProfile(): Record<string, unknown> {
    return this.demoSerializationService.findPlainProfile();
  }

  @Get('page/plain')
  @SerializeOptions({
    type: DemoSerializationPageDto,
    excludePrefixes: ['_'],
  })
  findPlainPage(): Record<string, unknown> {
    return this.demoSerializationService.findPlainPage();
  }
}
