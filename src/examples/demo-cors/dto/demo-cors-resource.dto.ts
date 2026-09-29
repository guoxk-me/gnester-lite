export class DemoCorsResourceDto {
  id!: string;
  visibility!: 'public' | 'credentialed';
  corsRequirement!: string;
}

export class DemoCredentialedCorsResourceDto extends DemoCorsResourceDto {
  hasSession!: boolean;
}
