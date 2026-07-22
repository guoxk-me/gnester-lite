// CN: 类型文件，描述 shared type augmentation 的 TypeScript 契约；EN: Type file describes TypeScript contracts for shared type augmentation.
import type { DemoSessionState } from '../features/demo-session/demo-session.types';

declare module 'express-session' {
  interface SessionData {
    demoSession?: DemoSessionState;
  }
}
