import type { DomainState } from '../domain/types';
import { endContraction, startContraction, startLabour } from '../domain/transitions';

/**
 * Demo shortcuts for Labour mode (16.3): fill the last hour with contractions so
 * the summary and the three signs can be shown without waiting an hour.
 */
export function fillLabourHour(state: DomainState, now: Date, scenario: 'one_sign' | 'all_signs'): DomainState {
  // one_sign matches the Figma S10 frame: about 4m 16s apart, 39s long, holding 44 minutes.
  const { n, gapSec, durSec } = scenario === 'one_sign' ? { n: 11, gapSec: 256, durSec: 39 } : { n: 16, gapSec: 270, durSec: 62 };
  const started = new Date(now.getTime() - (n * gapSec + 20 * 60) * 1000);
  let s = state.her.pregnancy?.labour && !state.her.pregnancy.labour.endedAt ? state : startLabour(state, started);
  const p = s.her.pregnancy!;
  s = { ...s, her: { ...s.her, pregnancy: { ...p, labour: { ...p.labour!, startedAt: started.toISOString(), contractions: [] } } } };
  for (let i = 0; i < n; i++) {
    const start = new Date(now.getTime() - (n - i) * gapSec * 1000 + 60_000);
    s = endContraction(startContraction(s, start), new Date(start.getTime() + durSec * 1000));
  }
  return s;
}
