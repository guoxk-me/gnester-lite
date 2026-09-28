import { ApplicationReadinessService } from './application-readiness.service';

describe('ApplicationReadinessService', () => {
  it('starts ready and becomes permanently unready when draining starts', () => {
    const service = new ApplicationReadinessService();

    expect(service.isReadyForTraffic()).toBe(true);
    expect(service.checkReadiness()).toEqual({
      application: {
        status: 'up',
      },
    });

    service.startDraining();
    service.startDraining();

    expect(service.isReadyForTraffic()).toBe(false);
    expect(service.checkReadiness()).toEqual({
      application: {
        status: 'down',
        message: 'Application is draining',
      },
    });
  });
});
