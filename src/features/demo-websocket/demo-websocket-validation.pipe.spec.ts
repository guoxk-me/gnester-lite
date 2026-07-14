// CN: 测试文件，验证 demo-websocket 的行为契约；EN: Test file verifies behavior contracts for demo-websocket.
import type { ArgumentMetadata } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { WsException } from '@nestjs/websockets';
import { createDemoWebsocketValidationPipe } from './demo-websocket-validation.pipe';

class DemoWebsocketValidationFixtureDto {
  @IsString()
  @MinLength(3)
  readonly message: string;
}

// CN: 测试分组：createDemoWebsocketValidationPipe；EN: Test group: createDemoWebsocketValidationPipe.
describe('createDemoWebsocketValidationPipe', () => {
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: DemoWebsocketValidationFixtureDto,
    data: undefined,
  };

  // CN: 测试用例：throws WsException with stable validation details for invalid socket data；EN: Test case: throws WsException with stable validation details for invalid socket data.
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

  // CN: 测试用例：transforms and returns valid socket data；EN: Test case: transforms and returns valid socket data.
  it('transforms and returns valid socket data', async () => {
    const pipe = createDemoWebsocketValidationPipe();

    await expect(
      pipe.transform({ message: 'alive' }, metadata),
    ).resolves.toBeInstanceOf(DemoWebsocketValidationFixtureDto);
  });
});
