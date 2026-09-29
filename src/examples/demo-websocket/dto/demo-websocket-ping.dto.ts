import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class DemoWebsocketPingDto {
  // AI modified: an omitted ping message uses the default, but a supplied message must be meaningful.
  @ApiProperty({
    description: 'Optional custom ping message',
    example: 'hello',
    minLength: 1,
    maxLength: 120,
    pattern: '\\S',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/\S/)
  @MaxLength(120)
  readonly message?: string;
}
