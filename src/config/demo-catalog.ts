import { Environment } from './config-enums.js';

// AI modified: one environment policy now controls both Demo modules and their schema assets.
export function shouldEnableDemos(nodeEnv: string | undefined): boolean {
  return nodeEnv !== Environment.Production;
}
