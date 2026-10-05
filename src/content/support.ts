import type { Review } from './copy';

/**
 * Region-configurable emergency and support numbers (PRD 11.3).
 * Every number must be verified before shipping.
 */
export const SUPPORT = {
  region: 'IN',
  emergency: { label: 'Emergency services', number: '112' },
  review: { kind: 'clinical', ref: '11.3', note: 'Verify emergency and support numbers per region' } satisfies Review,
} as const;
