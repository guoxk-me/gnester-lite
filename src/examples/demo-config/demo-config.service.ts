import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DemoConfigurationExampleDto } from './dto/demo-configuration-example.dto.js';

@Injectable()
export class DemoConfigService {
  constructor(private readonly configService: ConfigService) {}

  getConfigurationExample(): DemoConfigurationExampleDto {
    return {
      appName: this.configService.getOrThrow<string>('app.name'),
    };
  }
}
