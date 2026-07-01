// CN: 项目文件，支持 demo-events 的实现；EN: Project file supports implementation for demo-events.
import { DEMO_EVENTS } from '../demo-events.constants';

export class DemoCacheInvalidationRequestedEvent {
  readonly eventName = DEMO_EVENTS.CacheInvalidationRequested;

  // CN: 初始化 demo-events 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-events.
  constructor(
    readonly cacheKey: string,
    readonly reason: string,
    readonly requestedAt: string,
  ) {}
}
