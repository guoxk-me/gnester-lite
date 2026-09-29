import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DemoAuthProfileDto {
  @ApiProperty({ example: 'demo-admin' })
  readonly sub!: string;

  @ApiProperty({ example: 'admin@example.com' })
  readonly username!: string;

  @ApiPropertyOptional({ type: [String], example: ['admin'] })
  readonly roles?: readonly string[];

  @ApiPropertyOptional({ type: [String], example: ['demo:read'] })
  readonly permissions?: readonly string[];
}
