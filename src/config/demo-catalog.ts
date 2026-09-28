import { Environment } from './config.types';

// AI modified: one environment policy now controls both Demo modules and their schema assets.
export function shouldEnableDemos(nodeEnv: string | undefined): boolean {
  return nodeEnv !== Environment.Production;
}
