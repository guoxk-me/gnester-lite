import { Injectable } from '@nestjs/common';

import type { ApplicationReadinessResult } from './readiness.types.js';

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
