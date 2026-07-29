import { ApiProperty } from '@nestjs/swagger';

export class AccessTokenDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ example: '15m' })
  expiresIn!: string;
}
