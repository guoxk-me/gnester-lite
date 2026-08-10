import { DEMO_EVENTS } from '../demo-events.constants';

export class DemoUserRegisteredEvent {
  readonly eventName = DEMO_EVENTS.UserRegistered;

  constructor(
    readonly userId: string,
    readonly email: string,
    readonly displayName: string,
    readonly occurredAt: string,
  ) {}
}
