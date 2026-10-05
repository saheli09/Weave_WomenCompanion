import { useState, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import { PrimaryButton, TextAction } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { fieldCls, FieldError } from '../../components/Form';
import { formatTime, parseDate, toISODate } from '../../domain/dates';
import { birthTimeDefault, saveBirth, updateBirth } from '../../domain/transitions';
import { useDomain, useWeave } from '../../state/store';
import { now as clockNow } from '../../state/clock';
import { useToast } from '../../app/Toast';
import { LB } from '../quicklog/useHerLogs';

/**
 * Birth details (S12, 9.7). Everything is prefilled; each row edits inline
 * with the pencil. "Save birth" and "Skip for now" both create the child and
 * the birth record and move her to postpartum; Skip leaves a "Finish your
 * birth details" card on Today. The same screen edits an existing birth.
 */

type Draft = { name: string; date: string; time: string; place: string; weight: string };
type Key = keyof Draft;

export function BirthDetails() {
  const state = useDomain();
  const apply = useWeave((s) => s.apply);
  const navigate = useNavigate();
  const toast = useToast();
  const unit = state.her.units.weight;

  // Edit mode: no pregnancy, a birth exists (from "Finish your birth details").
  const editingId = state.her.phase !== 'pregnancy' ? (state.prompts.finishBirthDetails?.birthId ?? state.births.at(-1)?.id) : undefined;
  const editing = editingId ? state.births.find((b) => b.id === editingId) : undefined;
  const fromLabour = Boolean(state.her.pregnancy?.labour?.contractions.length);

  const [draft, setDraft] = useState<Draft>(() => {
    const at = parseDate(editing?.datetime ?? birthTimeDefault(state, clockNow()));
    const kg = editing?.weightG ? editing.weightG / 1000 : undefined;
    return {
      name: editing?.name ?? `B/O ${state.her.name}`,
      date: toISODate(at),
      time: format(at, 'HH:mm'),
      place: editing?.place ?? '',
      weight: kg ? (unit === 'lb' ? kg * LB : kg).toFixed(unit === 'lb' ? 1 : 2) : '',
    };
  });
  const [open, setOpen] = useState<Key | null>(null);
  const [tried, setTried] = useState(false);

  if (state.her.phase !== 'pregnancy' && !editing) return <Navigate to="/today" replace />;

  const datetime = new Date(`${draft.date}T${draft.time || '00:00'}:00`);
  const future = datetime.getTime() > clockNow().getTime() + 60_000;
  const [min, max] = unit === 'lb' ? [1, 15] : [0.4, 7];
  const w = Number(draft.weight.replace(',', '.'));
  const weightBad = Boolean(draft.weight) && (Number.isNaN(w) || w < min || w > max);
  const weightG = draft.weight && !weightBad ? Math.round((unit === 'lb' ? w / LB : w) * 1000) : undefined;

  const input = { name: draft.name, datetime: datetime.toISOString(), place: draft.place.trim() || undefined, weightG };

  const save = () => {
    setTried(true);
    if (future || weightBad) return;
    if (editing) {
      apply((s) => updateBirth(s, editing.id, input));
      toast(S.toastBirthSaved.text);
      navigate('/today');
    } else {
      apply((s, at) => saveBirth(s, input, at).state);
      navigate('/welcome');
    }
  };
  const skip = () => {
    apply((s, at) => saveBirth(s, {}, at, { skipped: true }).state);
    navigate('/welcome');
  };

  const row = (key: Key, label: string, display: ReactNode, control: ReactNode, empty = false) => (
    <li key={key} className="flex flex-col">
      {open === key ? (
        <div className="flex flex-col gap-2 py-3">
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 font-sans text-[12px] font-medium text-ink-3">{label}</span>
            {control}
            <TextAction onClick={() => setOpen(null)}>{S.doneEditing.text}</TextAction>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(key)} aria-label={fmt(S.editRowA11y, { label, value: typeof display === 'string' ? display : '' })} className="flex min-h-[48px] w-full items-center justify-between gap-3 py-2 text-left">
          <span className="font-sans text-[12px] font-medium text-ink-3">{label}</span>
          <span className="flex items-center gap-[5px]">
            <span className={`font-sans text-[12px] ${empty ? 'text-ink-3' : 'font-semibold text-ink'}`}>{display}</span>
            {!empty ? <Icon name="pencilSage" size={15} /> : null}
          </span>
        </button>
      )}
    </li>
  );

  const set = (k: Key) => (e: { target: { value: string } }) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const ctl = `${fieldCls} !min-h-[40px] text-[14px]`;

  return (
    <div className="flex min-h-full flex-1 flex-col justify-between gap-10" data-screen="birth-details">
      <div className="flex flex-col gap-[39px]">
        <div className="flex flex-col gap-5">
          <p className="type-micro text-ink-3">{S.birthLabel.text}</p>
          <div className="flex flex-col gap-[5px]">
            <h1 className="type-greeting text-ink">{editing ? S.birthEditTitle.text : S.birthTitle.text}</h1>
            <p className="font-sans text-[13px] font-medium text-ink-2">{S.birthSubtitle.text}</p>
          </div>
        </div>
        <ul className="flex w-full flex-col rounded-card bg-surface px-4 [&>li+li]:border-t [&>li+li]:border-line">
          {row('name', S.birthName.text, draft.name, <input autoFocus className={ctl} value={draft.name} onChange={set('name')} aria-label={S.birthName.text} />)}
          {row('date', S.birthDate.text, format(datetime, 'd MMMM yyyy'), <input type="date" className={ctl} value={draft.date} max={toISODate(clockNow())} onChange={set('date')} aria-label={S.birthDate.text} />)}
          {row('time', S.birthTime.text, formatTime(datetime).toLowerCase(), <input type="time" className={ctl} value={draft.time} onChange={set('time')} aria-label={S.birthTime.text} />)}
          {row('place', S.birthWhere.text, draft.place || S.birthWhereEmpty.text, <input autoFocus className={ctl} value={draft.place} onChange={set('place')} aria-label={S.birthWhere.text} />, !draft.place)}
          {row(
            'weight',
            S.birthWeight.text,
            draft.weight ? `${draft.weight} ${unit}` : S.birthWeightEmpty.text,
            <input autoFocus inputMode="decimal" className={ctl} value={draft.weight} onChange={set('weight')} aria-label={fmt(S.birthWeightUnit, { unit })} aria-invalid={weightBad} />,
            !draft.weight,
          )}
        </ul>
        <div className="flex flex-col gap-1">
          <FieldError>{tried && future ? S.birthDateFuture.text : undefined}</FieldError>
          <FieldError>{weightBad ? fmt(S.birthWeightError, { min, max, unit }) : undefined}</FieldError>
        </div>
        {!editing ? (
          <div className="rounded-card bg-sage-100 p-5">
            <p className="font-sans text-[12px] leading-[1.4] text-ink-2">{fromLabour ? S.birthNoteFromLabour.text : S.birthNoteNow.text}</p>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col items-center gap-5">
        <PrimaryButton size="lg" tone="sage" onClick={save}>
          {editing ? S.save.text : S.saveBirth.text}
        </PrimaryButton>
        {!editing ? <TextAction onClick={skip}>{S.skipForNow.text}</TextAction> : null}
      </div>
    </div>
  );
}

/** Handoff (B02): one warm, brief screen. No new account, no re-onboarding. */
export function Handoff() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-full flex-1 flex-col justify-between gap-10" data-screen="handoff">
      <div className="flex flex-1 flex-col justify-center gap-4 px-2">
        <h1 className="type-greeting text-[32px] text-ink">{S.handoffTitle.text}</h1>
        <p className="type-body text-[16px] text-ink-2">{S.handoffBody.text}</p>
      </div>
      <PrimaryButton size="lg" tone="sage" onClick={() => navigate('/today', { replace: true })}>
        {S.handoffContinue.text}
      </PrimaryButton>
    </div>
  );
}
