import type { Review } from './copy';

/**
 * Vaccination schedule (B16). India is the default (PRD 9.12), modelled on the
 * national schedule with common additions. NEEDS VERIFICATION against the
 * current official schedule before any real use; region-configurable.
 */
export interface VaccineDose {
  id: string;
  name: string;
  /** Due age in weeks from birth. */
  dueWeeks: number;
  ageLabel: string;
}

export const VACCINE_REVIEW: Review = { kind: 'clinical', ref: '9.12', note: 'Schedule needs verification for the region' };

export const VACCINE_SCHEDULE: { region: string; doses: VaccineDose[] } = {
  region: 'IN',
  doses: [
    { id: 'bcg', name: 'BCG', dueWeeks: 0, ageLabel: 'At birth' },
    { id: 'opv0', name: 'OPV 0', dueWeeks: 0, ageLabel: 'At birth' },
    { id: 'hepb1', name: 'Hepatitis B 1', dueWeeks: 0, ageLabel: 'At birth' },
    { id: 'penta1', name: 'Pentavalent 1', dueWeeks: 6, ageLabel: '6 weeks' },
    { id: 'opv1', name: 'OPV 1', dueWeeks: 6, ageLabel: '6 weeks' },
    { id: 'rota1', name: 'Rotavirus 1', dueWeeks: 6, ageLabel: '6 weeks' },
    { id: 'pcv1', name: 'PCV 1', dueWeeks: 6, ageLabel: '6 weeks' },
    { id: 'ipv1', name: 'fIPV 1', dueWeeks: 6, ageLabel: '6 weeks' },
    { id: 'penta2', name: 'Pentavalent 2', dueWeeks: 10, ageLabel: '10 weeks' },
    { id: 'opv2', name: 'OPV 2', dueWeeks: 10, ageLabel: '10 weeks' },
    { id: 'rota2', name: 'Rotavirus 2', dueWeeks: 10, ageLabel: '10 weeks' },
    { id: 'penta3', name: 'Pentavalent 3', dueWeeks: 14, ageLabel: '14 weeks' },
    { id: 'opv3', name: 'OPV 3', dueWeeks: 14, ageLabel: '14 weeks' },
    { id: 'rota3', name: 'Rotavirus 3', dueWeeks: 14, ageLabel: '14 weeks' },
    { id: 'pcv2', name: 'PCV 2', dueWeeks: 14, ageLabel: '14 weeks' },
    { id: 'ipv2', name: 'fIPV 2', dueWeeks: 14, ageLabel: '14 weeks' },
    { id: 'mr1', name: 'MR 1', dueWeeks: 39, ageLabel: '9 months' },
    { id: 'pcv-b', name: 'PCV booster', dueWeeks: 39, ageLabel: '9 months' },
    { id: 'je1', name: 'JE 1 (endemic areas)', dueWeeks: 39, ageLabel: '9 months' },
    { id: 'mr2', name: 'MR 2', dueWeeks: 69, ageLabel: '16 to 24 months' },
    { id: 'dpt-b1', name: 'DPT booster 1', dueWeeks: 69, ageLabel: '16 to 24 months' },
    { id: 'opv-b', name: 'OPV booster', dueWeeks: 69, ageLabel: '16 to 24 months' },
  ],
};
