export class DemoSerializationProfileResponseDto {
  readonly id!: number;
  readonly firstName!: string;
  readonly lastName!: string;
  readonly role!: string;
  readonly fullName!: string;
  readonly emailAddress!: string;
}

export class DemoSerializationAdminProfileResponseDto extends DemoSerializationProfileResponseDto {
  readonly auditTrail!: string[];
}

export class DemoSerializationPageResponseDto {
  readonly data!: DemoSerializationProfileResponseDto[];
  readonly total!: number;
  readonly page!: number;
  readonly limit!: number;
}
