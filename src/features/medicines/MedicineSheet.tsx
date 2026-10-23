import { useEffect, useState } from 'react';
import { BottomSheet } from '../../components/Sheet';
import { FilterChip } from '../../components/Chip';
import { TextAction } from '../../components/Button';
import { Icon, Plus } from '../../components/Icon';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import type { Medicine, MedicineSchedule, Subject } from '../../domain/types';
import { addMedicine, stopMedicine, updateMedicine } from '../../domain/transitions';
import { toISODate } from '../../domain/dates';
import { useWeave } from '../../state/store';
import { now } from '../../state/clock';
import { useToast } from '../../app/Toast';
import { Field, FieldError, fieldCls, labelCls } from '../../components/Form';

/**
 * Add or edit something she takes (B29): name, dose text, schedule (meal
 * anchors or clock times), start date. Weave never suggests doses (9.11).
 */

type Anchor = 'breakfast' | 'lunch' | 'dinner' | 'bedtime';
const ANCHORS: { value: Anchor; label: string }[] = [
  { value: 'breakfast', label: S.breakfast.text },
  { value: 'lunch', label: S.lunch.text },
  { value: 'dinner', label: S.dinner.text },
  { value: 'bedtime', label: S.bedtime.text },
];

const field = fieldCls;
const label = labelCls;

export function MedicineSheet({ open, onOpenChange, subject = { kind: 'her' }, editing }: { open: boolean; onOpenChange: (o: boolean) => void; subject?: Subject; editing?: Medicine }) {
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [mode, setMode] = useState<'anchors' | 'times'>('anchors');
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [startedOn, setStartedOn] = useState(toISODate(now()));
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTried(false);
    setName(editing?.name ?? '');
    setDose(editing?.doseText ?? '');
    if (editing && 'times' in editing.schedule) {
      setMode('times');
      setTimes(editing.schedule.times);
      setAnchors([]);
    } else {
      setMode('anchors');
      setAnchors(editing && 'anchors' in editing.schedule ? editing.schedule.anchors : []);
      setTimes(['08:00']);
    }
    setStartedOn(toISODate(now()));
  }, [open, editing]);

  const schedule: MedicineSchedule = mode === 'anchors' ? { anchors } : { times: times.filter(Boolean) };
  const nameMissing = !name.trim();
  const timeMissing = mode === 'anchors' ? !anchors.length : !times.filter(Boolean).length;
  const dirty = Boolean(name || dose || anchors.length) && !editing;

  const save = () => {
    setTried(true);
    if (nameMissing || timeMissing) return;
    const input = { name, doseText: dose, schedule, startedOn };
    if (editing) apply((s) => updateMedicine(s, editing.id, input));
    else apply((s) => addMedicine(s, subject, input).state);
    toast(fmt(S.toastMedSaved, { name: name.trim() }));
    onOpenChange(false);
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={editing ? S.medEditTitle.text : S.medAddTitle.text} onSave={save} dirty={dirty}>
      <form
        className="flex flex-col gap-5 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label={S.medName.text} error={tried && nameMissing ? S.medNameError.text : undefined}>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder={S.medNamePlaceholder.text} aria-invalid={tried && nameMissing} autoComplete="off" />
        </Field>
        <Field label={S.medDose.text} hint={S.medNoSuggest.text}>
          <input className={field} value={dose} onChange={(e) => setDose(e.target.value)} placeholder={S.medDosePlaceholder.text} autoComplete="off" />
        </Field>
        <fieldset className="flex flex-col gap-3">
          <legend className={`${label} mb-2`}>{S.medWhen.text}</legend>
          <div className="flex gap-2" role="radiogroup">
            <FilterChip role="radio" aria-checked={mode === 'anchors'} selected={mode === 'anchors'} onClick={() => setMode('anchors')}>
              {S.medWithMeals.text}
            </FilterChip>
            <FilterChip role="radio" aria-checked={mode === 'times'} selected={mode === 'times'} onClick={() => setMode('times')}>
              {S.medSetTimes.text}
            </FilterChip>
          </div>
          {mode === 'anchors' ? (
            <div className="flex flex-wrap gap-2">
              {ANCHORS.map((a) => (
                <FilterChip key={a.value} selected={anchors.includes(a.value)} onClick={() => setAnchors((xs) => (xs.includes(a.value) ? xs.filter((x) => x !== a.value) : [...xs, a.value]))}>
                  {a.label}
                </FilterChip>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {times.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="time" className={field} value={t} onChange={(e) => setTimes((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`${S.medWhen.text} ${i + 1}`} />
                  {times.length > 1 ? (
                    <TextAction onClick={() => setTimes((xs) => xs.filter((_, j) => j !== i))} aria-label={fmt(S.medRemoveTimeA11y, { time: t })}>
                      <Icon name="close" size={12} color="var(--color-ink-2)" />
                    </TextAction>
                  ) : null}
                </div>
              ))}
              <button type="button" onClick={() => setTimes((xs) => [...xs, '20:00'])} className="flex min-h-[44px] items-center gap-2 self-start font-sans text-[13px] font-semibold text-ink-2">
                <Plus size={10} /> {S.medAddTime.text}
              </button>
            </div>
          )}
          <FieldError>{tried && timeMissing ? S.medTimeError.text : undefined}</FieldError>
        </fieldset>
        {!editing ? (
          <Field label={S.medStarting.text}>
            <input type="date" className={field} value={startedOn} onChange={(e) => setStartedOn(e.target.value)} />
          </Field>
        ) : (
          <TextAction
            className="self-start !px-0 text-terracotta-ink"
            onClick={() => {
              apply((s) => stopMedicine(s, editing.id));
              toast(fmt(S.toastMedStopped, { name: editing.name }));
              onOpenChange(false);
            }}
          >
            {S.medStop.text}
          </TextAction>
        )}
      </form>
    </BottomSheet>
  );
}
