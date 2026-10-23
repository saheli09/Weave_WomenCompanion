import { format } from 'date-fns';
import { now } from './clock';

/** A typed clock time ("HH:mm") as today; if that is later than now, it means yesterday (late-night entries). */
export function atTime(hhmm: string): Date {
  const n = now();
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(n);
  d.setHours(h ?? n.getHours(), m ?? n.getMinutes(), 0, 0);
  if (d > n) d.setDate(d.getDate() - 1);
  return d;
}

export const hhmm = (d: Date) => format(d, 'HH:mm');
