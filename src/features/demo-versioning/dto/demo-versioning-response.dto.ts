export class DemoVersioningV1Dto {
  readonly version: '1';
  readonly message: string;
}

export class DemoVersioningV2Dto {
  readonly version: '2';
  readonly message: string;
  readonly changes: string[];
}

export class DemoVersioningSharedDto {
  readonly versions: ['1', '2'];
  readonly message: string;
}

export class DemoVersioningNeutralDto {
  readonly version: 'neutral';
  readonly message: string;
}
