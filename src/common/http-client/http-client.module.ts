import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';

// CN: HTTP 客户端模块统一外部请求配置；EN: HTTP client module centralizes outbound request setup.
@Global()
@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.getOrThrow<string>('http.baseUrl'),
        timeout: configService.getOrThrow<number>('http.timeout'),
        maxRedirects: configService.getOrThrow<number>('http.maxRedirects'),
        maxContentLength: configService.getOrThrow<number>(
          'http.maxContentLength',
        ),
        maxBodyLength: configService.getOrThrow<number>('http.maxBodyLength'),
      }),
    }),
  ],
  exports: [HttpModule],
})
export class CommonHttpClientModule {}
