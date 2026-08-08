import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const ROOM_NAME_PATTERN = /^[a-zA-Z0-9:_-]+$/;

export class DemoWebsocketRoomDto {
  @ApiProperty({
    description: 'Room name (alphanumeric, colon, underscore, hyphen)',
    example: 'room:general',
    minLength: 1,
    maxLength: 80,
    pattern: '^[a-zA-Z0-9:_-]+$',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(ROOM_NAME_PATTERN)
  readonly room!: string;
}
