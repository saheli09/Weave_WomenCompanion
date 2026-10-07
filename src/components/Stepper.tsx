import { S } from '../content/strings';
import { Plus } from './Icon';

/** −/+ number stepper with 44px targets. The value is announced politely. */
export function NumberStepper({ value, onChange, step, min, max, format, label }: { value: number; onChange: (v: number) => void; step: number; min: number; max: number; format: (v: number) => string; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-tile border border-line px-2" role="group" aria-label={label}>
      <button type="button" aria-label={`${S.lessA11y.text} ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))} className="grid size-11 place-items-center font-sans text-[22px] text-ink-2 disabled:opacity-30">
        −
      </button>
      <output aria-live="polite" className="type-kpi text-ink">
        {format(value)}
      </output>
      <button type="button" aria-label={`${S.moreA11y.text} ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))} className="grid size-11 place-items-center text-ink-2 disabled:opacity-30">
        <Plus size={14} />
      </button>
    </div>
  );
}
