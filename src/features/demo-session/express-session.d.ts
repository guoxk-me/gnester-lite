// CN: 类型增强，把 demo-session 状态挂到 express-session；EN: Type augmentation attaches demo-session state to express-session.
// AI modified: moved out of src/types so platform types do not depend on features.
import type { DemoSessionState } from './demo-session.types';

declare module 'express-session' {
  interface SessionData {
    demoSession?: DemoSessionState;
  }
}

export {};
