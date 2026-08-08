export class DemoSseScenarioDto {
  readonly name!: string;
  readonly route!: string;
  readonly eventType!: string;
  readonly useCase!: string;
  readonly demonstrates!: string;

  constructor(partial: DemoSseScenarioDto) {
    Object.assign(this, partial);
  }
}
