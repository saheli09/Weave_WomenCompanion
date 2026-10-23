import { useEffect, useState } from 'react';
import { BottomSheet } from '../../components/Sheet';
import { FilterChip } from '../../components/Chip';
import { NumberStepper } from '../../components/Stepper';
import { fieldCls } from '../../components/Form';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import type { LogEntry } from '../../domain/types';
import { addLog } from '../../domain/transitions';
import { useDomain, useWeave } from '../../state/store';
import { now as clockNow } from '../../state/clock';
import { atTime, hhmm } from '../../state/time';
import { abandonLog, commitLog, isLogging } from '../../metrics/timeToLog';
import { useToast } from '../../app/Toast';

/** Pump (B07): side, amount, minutes; prefilled from the last session. Her log. */
export function PumpSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const state = useDomain();
  const apply = useWeave((s) => s.apply);
  const undo = useWeave((s) => s.undo);
  const toast = useToast();
  const unit = state.her.units.volume;
  const last = state.logs.filter((l): l is Extract<LogEntry, { type: 'pump' }> => l.type === 'pump').sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  const [side, setSide] = useState<'left' | 'right' | 'both'>('both');
  const [ml, setMl] = useState(90);
  const [minutes, setMinutes] = useState(15);
  const [time, setTime] = useState(hhmm(clockNow()));
  useEffect(() => {
    if (!open) return;
    setSide(last?.side ?? 'both');
    setMl(last?.ml ?? 90);
    setMinutes(last?.minutes ?? 15);
    setTime(hhmm(clockNow()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const amount = unit === 'oz' ? `${Math.round(ml / 30)} oz` : `${ml} ml`;
  const save = () => {
    let id = '';
    apply((s) => {
      const r = addLog(s, { kind: 'her' }, { type: 'pump', side, ml, minutes }, atTime(time), 'sheet');
      id = r.entry.id;
      return r.state;
    });
    commitLog('pump');
    onOpenChange(false);
    toast(fmt(S.toastPump, { amount, minutes }), () => undo([id]));
  };
  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (!o && isLogging()) abandonLog('pump');
        onOpenChange(o);
      }}
      title={S.pumpTitle.text}
      onSave={save}
    >
      <div className="flex flex-col gap-5 pb-2">
        <div role="radiogroup" aria-label={S.pumpSide.text} className="flex gap-2">
          {(['left', 'right', 'both'] as const).map((sd) => (
            <FilterChip key={sd} role="radio" aria-checked={side === sd} selected={side === sd} onClick={() => setSide(sd)}>
              {sd === 'left' ? S.sideLeft.text : sd === 'right' ? S.sideRight.text : S.pumpBoth.text}
            </FilterChip>
          ))}
        </div>
        <NumberStepper value={ml} onChange={setMl} step={unit === 'oz' ? 30 : 10} min={unit === 'oz' ? 30 : 10} max={500} format={(v) => (unit === 'oz' ? `${Math.round(v / 30)} oz` : `${v} ml`)} label={S.amount.text} />
        <NumberStepper value={minutes} onChange={setMinutes} step={1} min={1} max={60} format={(v) => `${v} m`} label={S.minutesLabel.text} />
        <label className="flex items-center justify-between gap-3">
          <span className="type-row text-ink">{S.bottleTime.text}</span>
          <input type="time" className={`${fieldCls} w-32`} value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
    </BottomSheet>
  );
}
