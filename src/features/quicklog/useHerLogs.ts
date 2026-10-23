import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import type { MoodValue } from '../../domain/types';
import { useWeave } from '../../state/store';
import { now } from '../../state/clock';
import { waterToday } from '../../state/selectors';
import { commitLog } from '../../metrics/timeToLog';
import { useToast } from '../../app/Toast';
import { cap } from '../../state/selectors';

/** Her instant logs (10.1): water is an instant count; mood is one tap. Both offer Undo. */
export const LB = 2.20462;

export function useHerLogs() {
  const log = useWeave((s) => s.log);
  const undo = useWeave((s) => s.undo);
  const toast = useToast();

  /** With `inline`, the caller shows its own inline Undo next to the count (10.1) instead of a toast. */
  const logWater = (entry: string, opts: { inline?: boolean } = {}) => {
    const e = log({ kind: 'her' }, { type: 'water', glasses: 1 }, 'quick');
    commitLog('water', entry);
    const s = useWeave.getState().domain;
    if (!opts.inline) toast(fmt(S.toastWater, { count: waterToday(s, now()), goal: s.her.hydrationGoalGlasses }), () => undo([e.id]));
    return e.id;
  };

  const logMood = (value: MoodValue, entry: string) => {
    const e = log({ kind: 'her' }, { type: 'mood', value }, 'quick');
    commitLog('mood', entry);
    toast(fmt(S.toastMood, { mood: cap(value) }), () => undo([e.id]));
  };

  const logSymptom = (name: string, note: string | undefined, entry: string) => {
    const e = log({ kind: 'her' }, { type: 'symptom', name }, 'sheet', { note });
    commitLog('symptom', entry);
    toast(fmt(S.toastSymptom, { name }), () => undo([e.id]));
  };

  const logWeight = (kg: number, entry: string) => {
    const e = log({ kind: 'her' }, { type: 'weight', kg }, 'sheet');
    commitLog('weight', entry);
    const units = useWeave.getState().domain.her.units.weight;
    toast(fmt(S.toastWeight, { value: units === 'lb' ? (kg * LB).toFixed(1) : kg.toFixed(1), unit: units }), () => undo([e.id]));
  };

  const logNote = (text: string, entry: string) => {
    const e = log({ kind: 'her' }, { type: 'note', text }, 'sheet');
    commitLog('note', entry);
    toast(S.toastNote.text, () => undo([e.id]));
  };

  return { logWater, logMood, logSymptom, logWeight, logNote };
}
