import { DemoVersioningService } from './demo-versioning.service';

describe('DemoVersioningService', () => {
  let service: DemoVersioningService;

  beforeEach(() => {
    service = new DemoVersioningService();
  });

  it('returns the version 1 example response', () => {
    expect(service.findV1()).toEqual({
      version: '1',
      message: 'demo versioning response for v1',
    });
  });

  it('returns the version 2 example response', () => {
    expect(service.findV2()).toEqual({
      version: '2',
      message: 'demo versioning response for v2',
      changes: ['adds a changes field'],
    });
  });

  it('returns a response shared by versions 1 and 2', () => {
    expect(service.findShared()).toEqual({
      versions: ['1', '2'],
      message: 'shared response for v1 and v2',
    });
  });

  it('returns a version-neutral example response', () => {
    expect(service.findNeutral()).toEqual({
      version: 'neutral',
      message: 'available without an API version prefix',
    });
  });
});
