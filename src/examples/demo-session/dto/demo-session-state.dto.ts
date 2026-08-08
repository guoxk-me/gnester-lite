import { ApiProperty } from '@nestjs/swagger';

import {
  DEMO_SESSION_FLASH_LEVELS,
  DEMO_SESSION_MAX_CART_ITEMS,
  DEMO_SESSION_MAX_FLASH_MESSAGES,
  DEMO_SESSION_ROLES,
  type DemoSessionFlashLevel,
  type DemoSessionRole,
} from '../demo-session.types';
import { DemoSessionCartItemDto } from './demo-session-cart-item.dto';

export class DemoSessionUserDto {
  @ApiProperty({ example: 'user_1' })
  readonly userId!: string;

  @ApiProperty({ example: 'Demo User' })
  readonly displayName!: string;

  @ApiProperty({ enum: DEMO_SESSION_ROLES, example: 'member' })
  readonly role!: DemoSessionRole;

  @ApiProperty({ format: 'date-time' })
  readonly authenticatedAt!: string;
}

export class DemoSessionFlashMessageDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ enum: DEMO_SESSION_FLASH_LEVELS, example: 'success' })
  readonly level!: DemoSessionFlashLevel;

  @ApiProperty({ example: 'Saved successfully' })
  readonly message!: string;

  @ApiProperty({ format: 'date-time' })
  readonly createdAt!: string;
}

export class DemoSessionStateDto {
  @ApiProperty()
  readonly authenticated!: boolean;

  @ApiProperty({ type: DemoSessionUserDto, nullable: true })
  readonly user!: DemoSessionUserDto | null;

  @ApiProperty({ minimum: 0 })
  readonly visits!: number;

  @ApiProperty({
    type: [DemoSessionFlashMessageDto],
    maxItems: DEMO_SESSION_MAX_FLASH_MESSAGES,
  })
  readonly flashMessages!: DemoSessionFlashMessageDto[];

  @ApiProperty({
    type: [DemoSessionCartItemDto],
    maxItems: DEMO_SESSION_MAX_CART_ITEMS,
  })
  readonly cart!: DemoSessionCartItemDto[];

  @ApiProperty({ minimum: 0 })
  readonly cartItemCount!: number;
}

export class DemoSessionFlashMessagesDto {
  @ApiProperty({ minimum: 0 })
  readonly consumed!: number;

  @ApiProperty({
    type: [DemoSessionFlashMessageDto],
    maxItems: DEMO_SESSION_MAX_FLASH_MESSAGES,
  })
  readonly messages!: DemoSessionFlashMessageDto[];
}
