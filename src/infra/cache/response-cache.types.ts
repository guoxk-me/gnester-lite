import type { ExecutionContext } from '@nestjs/common';

export type ResponseCacheTtlFactory = (
  context: ExecutionContext,
) => number | Promise<number>;

export type ResponseCacheTtl = number | ResponseCacheTtlFactory;
