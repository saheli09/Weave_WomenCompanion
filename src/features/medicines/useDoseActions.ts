import { isSameDay } from 'date-fns';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import { formatTimeCompact, parseDate } from '../../domain/dates';
import type { Subject } from '../../domain/types';
import { removeLog } from '../../domain/transitions';
import { useWeave } from '../../state/store';
import { now } from '../../state/clock';
import { commitLog } from '../../metrics/timeToLog';
import { useToast } from '../../app/Toast';

/** Tick or untick a scheduled dose (9.5). Ticking records the taken time; Undo reverses it. */
export function useDoseActions() {
  const log = useWeave((s) => s.log);
  const apply = useWeave((s) => s.apply);
  const undo = useWeave((s) => s.undo);
  const toast = useToast();

  const take = (medicineId: string, slot: string, entry: string) => {
    const med = useWeave.getState().domain.medicines.find((m) => m.id === medicineId);
    if (!med) return;
    const subject: Subject = med.subject;
    const at = now();
    const e = log(subject, { type: 'dose', medicineId, takenAt: at.toISOString(), slot }, 'quick');
    commitLog('dose', entry);
    toast(fmt(S.toastDose, { name: med.name, time: formatTimeCompact(at) }), () => undo([e.id]));
  };

  const untake = (medicineId: string, slot: string) => {
    const state = useWeave.getState().domain;
    const med = state.medicines.find((m) => m.id === medicineId);
    const t = now();
    const ids = state.logs.filter((l) => l.type === 'dose' && l.medicineId === medicineId && l.slot === slot && isSameDay(parseDate(l.at), t)).map((l) => l.id);
    const removed = state.logs.filter((l) => ids.includes(l.id));
    apply((s) => ids.reduce(removeLog, s));
    toast(fmt(S.toastDoseUndone, { name: med?.name ?? '' }), () => apply((s) => ({ ...s, logs: [...s.logs, ...removed] })));
  };

  return { take, untake };
}
