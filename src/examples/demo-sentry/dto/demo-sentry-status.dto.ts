export class DemoSentryStatusDto {
  readonly enabled!: boolean;
  readonly hasDsn!: boolean;
  readonly environment!: string;
  readonly tracesSampleRate!: number | null;
  readonly notes!: string[];
}
