import { useEffect, useState } from 'react';
import { BottomSheet } from '../../components/Sheet';
import { FilterChip } from '../../components/Chip';
import { Field, fieldCls } from '../../components/Form';
import { Copy } from '../../components/Copy';
import { ReviewTag, useReviewMarkers } from '../../components/ReviewFlag';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import { PREGNANCY_SYMPTOMS, SYMPTOM_REVIEW } from '../../content/symptoms';
import { formatTimeSince } from '../../domain/dates';
import { useDomain } from '../../state/store';
import { useNow } from '../../state/clock';
import { lastOf } from '../../state/selectors';
import { abandonLog, isLogging } from '../../metrics/timeToLog';
import { LB, useHerLogs } from './useHerLogs';

/** Pregnancy quick-log sheets (B28): Symptom, Weight, Note. */

type Props = { open: boolean; onOpenChange: (o: boolean) => void; entry?: string };
const closeWith = (onOpenChange: Props['onOpenChange'], action: 'symptom' | 'weight' | 'note') => (o: boolean) => {
  if (!o && isLogging()) abandonLog(action);
  onOpenChange(o);
};

/** One tap on a chip logs it; "Something else" takes free text. Always shows the provider off-ramp. */
export function SymptomSheet({ open, onOpenChange, entry = 'fab' }: Props) {
  const { logSymptom } = useHerLogs();
  const markers = useReviewMarkers();
  const [other, setOther] = useState(false);
  const [text, setText] = useState('');
  useEffect(() => {
    if (open) {
      setOther(false);
      setText('');
    }
  }, [open]);
  const done = (name: string, note?: string) => {
    logSymptom(name, note, entry);
    onOpenChange(false);
  };
  return (
    <BottomSheet open={open} onOpenChange={closeWith(onOpenChange, 'symptom')} title={S.symptomTitle.text} onSave={other ? () => text.trim() && done(text.trim()) : undefined} saveDisabled={!text.trim()} dirty={Boolean(text)}>
      <div className="flex flex-col gap-5 pb-2">
        {markers ? (
          <span>
            <ReviewTag review={SYMPTOM_REVIEW} />
          </span>
        ) : null}
        <div className="flex flex-wrap gap-2">
            {PREGNANCY_SYMPTOMS.map((s) => (
              <FilterChip key={s} selected={false} onClick={() => done(s)}>
                {s}
              </FilterChip>
            ))}
            <FilterChip selected={other} onClick={() => setOther(true)}>
              {S.symptomOther.text}
            </FilterChip>
        </div>
        {other ? (
          <Field label={S.symptomOther.text}>
            <input autoFocus className={fieldCls} value={text} onChange={(e) => setText(e.target.value)} placeholder={S.symptomOtherPlaceholder.text} />
          </Field>
        ) : null}
        <Copy as="p" entry={S.symptomOffRamp} className="type-body text-ink-2" />
      </div>
    </BottomSheet>
  );
}

/** Weight, prefilled with the last value, in her units. Stored in kg. */
export function WeightSheet({ open, onOpenChange, entry = 'fab' }: Props) {
  const state = useDomain();
  const now = useNow();
  const { logWeight } = useHerLogs();
  const unit = state.her.units.weight;
  const last = lastOf(state, now, 'weight', (l) => l.subject.kind === 'her');
  const toUnit = (kg: number) => (unit === 'lb' ? kg * LB : kg);
  const [value, setValue] = useState('');
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (open) {
      setTried(false);
      setValue(last ? toUnit(last.kg).toFixed(1) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const [min, max] = unit === 'lb' ? [66, 440] : [30, 200];
  const n = Number(value.replace(',', '.'));
  const invalid = !value || Number.isNaN(n) || n < min || n > max;
  const save = () => {
    setTried(true);
    if (invalid) return;
    logWeight(unit === 'lb' ? n / LB : n, entry);
    onOpenChange(false);
  };
  return (
    <BottomSheet open={open} onOpenChange={closeWith(onOpenChange, 'weight')} title={S.weightTitle.text} onSave={save}>
      <form className="flex flex-col gap-5 pb-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Field
          label={fmt(S.weightLabel, { unit })}
          hint={last ? fmt(S.weightLast, { value: toUnit(last.kg).toFixed(1), unit, ago: formatTimeSince(last.at, now).toLowerCase() }) : undefined}
          error={tried && invalid ? fmt(S.weightError, { min, max, unit }) : undefined}
        >
          <input className={`${fieldCls} type-kpi`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={tried && invalid} />
        </Field>
      </form>
    </BottomSheet>
  );
}

export function NoteSheet({ open, onOpenChange, entry = 'fab' }: Props) {
  const { logNote } = useHerLogs();
  const [text, setText] = useState('');
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (open) {
      setText('');
      setTried(false);
    }
  }, [open]);
  const save = () => {
    setTried(true);
    if (!text.trim()) return;
    logNote(text.trim(), entry);
    onOpenChange(false);
  };
  return (
    <BottomSheet open={open} onOpenChange={closeWith(onOpenChange, 'note')} title={S.noteTitle.text} onSave={save} dirty={Boolean(text)}>
      <div className="flex flex-col gap-2 pb-2">
        <textarea
          aria-label={S.noteTitle.text}
          className={`${fieldCls} min-h-[120px] py-3`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={S.notePlaceholder.text}
          aria-invalid={tried && !text.trim()}
        />
        {tried && !text.trim() ? <span role="alert" className="font-sans text-[12px] font-medium text-terracotta-ink">{S.noteError.text}</span> : null}
      </div>
    </BottomSheet>
  );
}
