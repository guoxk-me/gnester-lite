import { Injectable } from '@nestjs/common';
import {
  DemoVersioningNeutralDto,
  DemoVersioningSharedDto,
  DemoVersioningV1Dto,
  DemoVersioningV2Dto,
} from './dto/demo-versioning-response.dto';

@Injectable()
export class DemoVersioningService {
  findV1(): DemoVersioningV1Dto {
    return {
      version: '1',
      message: 'demo versioning response for v1',
    };
  }

  findV2(): DemoVersioningV2Dto {
    return {
      version: '2',
      message: 'demo versioning response for v2',
      changes: ['adds a changes field'],
    };
  }

  findShared(): DemoVersioningSharedDto {
    return {
      versions: ['1', '2'],
      message: 'shared response for v1 and v2',
    };
  }

  findNeutral(): DemoVersioningNeutralDto {
    return {
      version: 'neutral',
      message: 'available without an API version prefix',
    };
  }
}
