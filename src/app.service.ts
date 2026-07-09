import { Injectable } from '@nestjs/common';

// CN: 根服务承载首页响应逻辑；EN: Root service holds the home response logic.
@Injectable()
export class AppService {
  // CN: 返回根接口的欢迎文本；EN: Returns the welcome text for the root endpoint.
  getHello(): string {
    return 'Hello World!';
  }
}
