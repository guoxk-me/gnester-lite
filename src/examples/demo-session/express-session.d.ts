// AI modified: keep example-only session augmentation out of platform and production features.
import type { DemoSessionState } from './demo-session.types';

declare module 'express-session' {
  interface SessionData {
    demoSession?: DemoSessionState;
  }
}

export {};
