import { Injectable } from '@nestjs/common';

export type ApplicationReadinessResult = Record<
  'application',
  {
    readonly status: 'up' | 'down';
    readonly message?: string;
  }
>;

@Injectable()
export class ApplicationReadinessService {
  private isDraining = false;

  isReadyForTraffic(): boolean {
    return !this.isDraining;
  }

  startDraining(): void {
    // AI modified: shutdown readiness is irreversible so repeated signals cannot reopen admission.
    this.isDraining = true;
  }

  checkReadiness(): ApplicationReadinessResult {
    if (this.isDraining) {
      return {
        application: {
          status: 'down',
          message: 'Application is draining',
        },
      };
    }

    return {
      application: {
        status: 'up',
      },
    };
  }
}
