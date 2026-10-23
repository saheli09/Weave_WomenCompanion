import type { Review } from './copy';

/**
 * Pregnancy symptom chips (B28). Plain names only; Weave never interprets them.
 * The list itself needs clinical review: some of these can be warning signs
 * (for example sudden swelling or a severe headache), which is why the sheet
 * always shows a provider off-ramp.
 */
export const PREGNANCY_SYMPTOMS = ['Nausea', 'Heartburn', 'Back pain', 'Tiredness', 'Headache', 'Swelling', 'Cramps', 'Leg cramps', 'Trouble sleeping'] as const;

export const SYMPTOM_REVIEW: Review = { kind: 'clinical', ref: 'B28', note: 'Symptom list; possible red-flag symptoms need a defined route' };
