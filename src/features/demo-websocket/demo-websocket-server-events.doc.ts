// CN: 文档辅助类，为网关外触发的服务器推送事件提供 AsyncAPI 描述
// EN: Doc-only class provides AsyncAPI descriptions for server-emitted events
//     triggered outside the gateway handler methods (filter, interceptor, lifecycle).
import { AsyncApi, AsyncApiSend } from 'nestjs-asyncapi';

import {
  DemoWebsocketErrorDetailDto,
  DemoWebsocketExceptionDto,
  DemoWebsocketInterceptedDto,
} from './dto/demo-websocket-response.dto';

@AsyncApi()
export class DemoWebsocketServerEventsDoc {
  @AsyncApiSend({
    channel: 'demo-websocket.exception',
    message: {
      name: 'DemoWebsocketException',
      payload: DemoWebsocketExceptionDto,
    },
  })
  handleException(): void {}

  @AsyncApiSend({
    channel: 'demo-websocket.intercepted',
    message: {
      name: 'DemoWebsocketIntercepted',
      payload: DemoWebsocketInterceptedDto,
    },
  })
  handleIntercepted(): void {}

  @AsyncApiSend({
    channel: 'demo-websocket.error.detail',
    message: {
      name: 'DemoWebsocketErrorDetail',
      payload: DemoWebsocketErrorDetailDto,
    },
  })
  handleErrorDetail(): void {}
}
