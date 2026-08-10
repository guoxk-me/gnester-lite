import type { ArgumentMetadata } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { WsException } from '@nestjs/websockets';
import { DemoWebsocketPingDto } from './dto/demo-websocket-ping.dto';
import { DemoWebsocketRoomMessageDto } from './dto/demo-websocket-room-message.dto';
import { createDemoWebsocketValidationPipe } from './demo-websocket-validation.pipe';

class DemoWebsocketValidationFixtureDto {
  @IsString()
  @MinLength(3)
  readonly message!: string;
}

describe('createDemoWebsocketValidationPipe', () => {
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: DemoWebsocketValidationFixtureDto,
    data: undefined,
  };

  it('throws WsException with stable validation details for invalid socket data', async () => {
    const pipe = createDemoWebsocketValidationPipe();

    await expect(pipe.transform({ message: 'x' }, metadata)).rejects.toEqual(
      expect.objectContaining({
        constructor: WsException,
      }),
    );

    try {
      await pipe.transform({ message: 'x' }, metadata);
      throw new Error('Expected websocket validation to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(WsException);
      expect((error as WsException).getError()).toEqual({
        code: 'WEBSOCKET_VALIDATION_FAILED',
        message: 'Validation failed',
        errors: [
          {
            field: 'message',
            reason: 'message must be longer than or equal to 3 characters',
          },
        ],
      });
    }
  });

  it('transforms and returns valid socket data', async () => {
    const pipe = createDemoWebsocketValidationPipe();

    await expect(
      pipe.transform({ message: 'alive' }, metadata),
    ).resolves.toBeInstanceOf(DemoWebsocketValidationFixtureDto);
  });

  it('rejects a whitespace-only room message through the socket pipe', async () => {
    const pipe = createDemoWebsocketValidationPipe();
    const roomMessageMetadata: ArgumentMetadata = {
      type: 'body',
      metatype: DemoWebsocketRoomMessageDto,
      data: undefined,
    };

    await expect(
      pipe.transform(
        { room: 'room:general', message: '   ' },
        roomMessageMetadata,
      ),
    ).rejects.toBeInstanceOf(WsException);
  });

  it('accepts an omitted ping message but rejects whitespace when supplied', async () => {
    const pipe = createDemoWebsocketValidationPipe();
    const pingMetadata: ArgumentMetadata = {
      type: 'body',
      metatype: DemoWebsocketPingDto,
      data: undefined,
    };

    await expect(pipe.transform({}, pingMetadata)).resolves.toBeInstanceOf(
      DemoWebsocketPingDto,
    );
    await expect(
      pipe.transform({ message: '   ' }, pingMetadata),
    ).rejects.toBeInstanceOf(WsException);
  });
});
