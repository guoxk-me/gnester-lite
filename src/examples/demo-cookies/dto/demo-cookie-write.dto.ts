import { ApiProperty } from '@nestjs/swagger';

export class DemoCookieWriteDto {
  readonly name!: string;
  readonly action!: 'set' | 'clear';
  readonly httpOnly!: boolean;
  readonly secure!: boolean;

  // AI modified: the demo always emits an RFC same-site string, never an object.
  @ApiProperty({ type: String, enum: ['lax', 'strict', 'none'] })
  readonly sameSite!: string | boolean;
  readonly path!: string;
  readonly maxAge?: number;
  readonly signed!: boolean;
}
