// CN: DTO，描述 demo-sentry 的运行状态；EN: DTO describes runtime status for demo-sentry.
export class DemoSentryStatusDto {
  readonly enabled: boolean;
  readonly hasDsn: boolean;
  readonly environment: string;
  readonly tracesSampleRate: number | null;
  readonly notes: string[];
}
