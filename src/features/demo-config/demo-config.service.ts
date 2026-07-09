// CN: 服务，承载 demo-config 的业务逻辑；EN: Service holds business logic for demo-config.
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DemoConfigurationExampleDto } from './dto/demo-configuration-example.dto';

@Injectable()
export class DemoConfigService {
  // CN: 初始化 demo-config 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-config.
  constructor(private readonly configService: ConfigService) {}

  // CN: 执行 demo-config 的 get configuration example 业务逻辑；EN: Runs the get configuration example business logic for demo-config.
  getConfigurationExample(): DemoConfigurationExampleDto {
    return {
      appName: this.configService.getOrThrow<string>('app.name'),
    };
  }
}
