import { addLog, emptyState } from '../domain/transitions';
import { waterNudge } from './selectors';

const at = (h: number, m = 0) => new Date(2026, 7, 27, h, m);
const drink = (s: ReturnType<typeof emptyState>, h: number, glasses = 1) => addLog(s, { kind: 'her' }, { type: 'water', glasses }, at(h), 'quick').state;

describe('waterNudge (decision 2026-10-30)', () => {
  const fresh = emptyState('Asha', 'cycle_tracking');

  it('no glass yet: quiet before 10am, overdue from 10am', () => {
    expect(waterNudge(fresh, at(9, 30))).toBeUndefined();
    expect(waterNudge(fresh, at(10))).toEqual({ kind: 'none-yet' });
  });

  it('three hours since the last glass', () => {
    const s = drink(fresh, 9);
    expect(waterNudge(s, at(11, 59))).toBeUndefined();
    expect(waterNudge(s, at(12))).toEqual({ kind: 'since', hours: 3 });
    expect(waterNudge(s, at(17, 30))).toEqual({ kind: 'since', hours: 8 });
  });

  it('quiet at night and once the goal is met', () => {
    expect(waterNudge(fresh, at(21, 30))).toBeUndefined();
    expect(waterNudge(fresh, at(7))).toBeUndefined();
    expect(waterNudge(drink(fresh, 9, 8), at(16))).toBeUndefined();
  });
});
