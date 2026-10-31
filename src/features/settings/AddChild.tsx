import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import { BottomSheet } from '../../components/Sheet';
import { Field, FieldError, fieldCls } from '../../components/Form';
import { FilterChip } from '../../components/Chip';
import { addChild } from '../../domain/transitions';
import { toISODate } from '../../domain/dates';
import type { FeedingMode } from '../../domain/types';
import { useWeave } from '../../state/store';
import { now as clockNow } from '../../state/clock';
import { useToast } from '../../app/Toast';
import { ageWords, feedingForAge } from '../onboarding/Onboarding';

/**
 * Add a child from Settings (6.2 "Add child"): the same facts onboarding asks.
 * A child switches her fourth tab to Baby (stageTab), so she lands there.
 */
export function AddChildSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const apply = useWeave((s) => s.apply);
  const navigate = useNavigate();
  const toast = useToast();
  const now = clockNow();
  const today = toISODate(now);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [feeding, setFeeding] = useState<FeedingMode[]>([]);
  const [touched, setTouched] = useState(false);
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (!open) return;
    setName('');
    setDob('');
    setFeeding([]);
    setTouched(false);
    setTried(false);
  }, [open]);
  // Feeding follows the age until she changes it, as in onboarding.
  useEffect(() => {
    if (!touched && dob && dob <= today) setFeeding(feedingForAge(dob, now));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dob, touched]);

  const future = Boolean(dob) && dob > today;
  const ok = Boolean(name.trim()) && Boolean(dob) && !future && feeding.length > 0;
  const save = () => {
    setTried(true);
    if (!ok) return;
    apply((s) => addChild(s, { name: name.trim(), dob, feeding }).state);
    onOpenChange(false);
    toast(fmt(S.addChildToast, { name: name.trim() }));
    navigate('/baby');
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={S.addChildTitle.text} onSave={save} saveLabel={S.addChildSave.text} dirty={Boolean(name || dob)}>
      <div className="flex flex-col gap-5 pb-2">
        <Field label={S.onbChildName.text} error={tried && !name.trim() ? S.onbChildNameError.text : undefined}>
          <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field
          label={S.onbChildDob.text}
          error={future ? S.onbFutureError.text : tried && !dob ? S.onbDateError.text : undefined}
          hint={dob && !future && name.trim() ? fmt(S.onbChildLine, { name: name.trim(), age: ageWords(dob, now) }) : undefined}
        >
          <input type="date" className={fieldCls} value={dob} max={today} onChange={(e) => setDob(e.target.value)} />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-sans text-[13px] font-semibold text-ink">{fmt(S.onbFeeding, { name: name.trim() || S.addChildThem.text })}</legend>
          <div className="flex flex-wrap gap-2">
            {(['breast', 'bottle', 'solids'] as FeedingMode[]).map((f) => (
              <FilterChip
                key={f}
                selected={feeding.includes(f)}
                onClick={() => {
                  setTouched(true);
                  setFeeding((xs) => (xs.includes(f) ? xs.filter((x) => x !== f) : [...xs, f]));
                }}
              >
                {f === 'breast' ? S.breastfeed.text : f === 'bottle' ? S.bottleFeed.text : S.solids.text}
              </FilterChip>
            ))}
          </div>
          <FieldError>{tried && !feeding.length ? S.onbFeedingError.text : undefined}</FieldError>
        </fieldset>
      </div>
    </BottomSheet>
  );
}
