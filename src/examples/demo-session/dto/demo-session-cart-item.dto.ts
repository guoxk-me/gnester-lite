import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DemoSessionCartItemDto {
  @ApiProperty({ example: 'sku_1' })
  readonly sku!: string;

  @ApiPropertyOptional({ example: 'Demo Item' })
  readonly name?: string;

  @ApiProperty({ example: 2, minimum: 1 })
  readonly quantity!: number;

  @ApiProperty({ format: 'date-time' })
  readonly addedAt!: string;

  @ApiProperty({ format: 'date-time' })
  readonly updatedAt!: string;
}
