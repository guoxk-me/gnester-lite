export class DemoStreamingFileScenarioDto {
  readonly route!: string;
  readonly scenario!: string;
  readonly demonstrates!: string;

  constructor(partial: DemoStreamingFileScenarioDto) {
    Object.assign(this, partial);
  }
}
