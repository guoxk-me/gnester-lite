// CN: DTO 文件，定义 demo-cors 的数据结构；EN: DTO file defines data shapes for demo-cors.
export class DemoCorsResourceDto {
  id: string;
  visibility: 'public' | 'credentialed';
  corsRequirement: string;
}

export class DemoCredentialedCorsResourceDto extends DemoCorsResourceDto {
  hasSession: boolean;
}
