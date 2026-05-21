import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface DemoConfigurationExample {
  readonly appName: string;
}

@Injectable()
export class DemoConfigService {
  constructor(private readonly configService: ConfigService) {}

  getConfigurationExample(): DemoConfigurationExample {
    return {
      appName: this.configService.getOrThrow<string>('app.name'),
    };
  }
}
