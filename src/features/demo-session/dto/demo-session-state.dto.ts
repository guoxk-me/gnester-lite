// CN: DTO 文件，定义 demo-session 的数据结构；EN: DTO file defines data shapes for demo-session.
import type {
  DemoSessionCartItem,
  DemoSessionFlashMessage,
  DemoSessionUser,
} from '../demo-session.types';

export class DemoSessionStateDto {
  readonly authenticated: boolean;
  readonly user: DemoSessionUser | null;
  readonly visits: number;
  readonly flashMessages: DemoSessionFlashMessage[];
  readonly cart: DemoSessionCartItem[];
  readonly cartItemCount: number;
}

export class DemoSessionFlashMessagesDto {
  readonly consumed: number;
  readonly messages: DemoSessionFlashMessage[];
}
