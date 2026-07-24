import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpConfig } from 'config/config.types';
import { createHttpModuleOptions } from './http-client.config';

// CN: HTTP 客户端模块统一外部请求配置；EN: HTTP client module centralizes outbound request setup.
@Global()
@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      // AI modified: use shared factory so HttpModule options stay unit-testable.
      useFactory: (configService: ConfigService) =>
        createHttpModuleOptions(configService.getOrThrow<HttpConfig>('http')),
    }),
  ],
  exports: [HttpModule],
})
export class CommonHttpClientModule {}
