import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  SerializeOptions,
  UseInterceptors,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { DemoSerializationPageDto } from './dto/demo-serialization-page.dto';
import {
  DemoSerializationAdminProfileResponseDto,
  DemoSerializationPageResponseDto,
  DemoSerializationProfileResponseDto,
} from './dto/demo-serialization-response.dto';
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
  // AI modified: the serialized wire shape intentionally differs from the runtime class.
  @ApiResponse({ status: 200, type: DemoSerializationProfileResponseDto })
  findProfile(): DemoSerializationUserDto {
    return this.demoSerializationService.findProfile();
  }

  @Get('profile/admin')
  @SerializeOptions({ groups: ['admin'], excludePrefixes: ['_'] })
  @ApiResponse({
    status: 200,
    type: DemoSerializationAdminProfileResponseDto,
  })
  findAdminProfile(): DemoSerializationUserDto {
    return this.demoSerializationService.findAdminProfile();
  }

  @Get('profile/plain')
  @SerializeOptions({
    type: DemoSerializationUserDto,
    excludePrefixes: ['_'],
  })
  @ApiResponse({ status: 200, type: DemoSerializationProfileResponseDto })
  findPlainProfile(): Record<string, unknown> {
    return this.demoSerializationService.findPlainProfile();
  }

  @Get('page/plain')
  @SerializeOptions({
    type: DemoSerializationPageDto,
    excludePrefixes: ['_'],
  })
  @ApiResponse({ status: 200, type: DemoSerializationPageResponseDto })
  findPlainPage(): Record<string, unknown> {
    return this.demoSerializationService.findPlainPage();
  }
}
