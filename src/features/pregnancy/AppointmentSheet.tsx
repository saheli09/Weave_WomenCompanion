import { useEffect, useState } from 'react';
import { addDays, format } from 'date-fns';
import { BottomSheet } from '../../components/Sheet';
import { TextAction } from '../../components/Button';
import { Field, fieldCls } from '../../components/Form';
import { Copy } from '../../components/Copy';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import type { Milestone } from '../../content/milestones';
import type { Appointment } from '../../domain/types';
import { addAppointment, removeAppointment, updateAppointment } from '../../domain/transitions';
import { formatLongDate, parseDate, PREGNANCY_DAYS, toISODate } from '../../domain/dates';
import { useWeave } from '../../state/store';
import { now } from '../../state/clock';
import { useToast } from '../../app/Toast';

/**
 * Appointments (B30): add, edit, remove, or book a suggested check. Suggested
 * checks come from content/milestones.ts and carry a clinical-review flag.
 */

export type AppointmentTarget = { kind: 'new' } | { kind: 'edit'; appointment: Appointment } | { kind: 'book'; milestone: Milestone };

/** Default date for a suggested check: the suggested week, measured from the due date. */
export function suggestedDate(dueDate: string, week: number): Date {
  const d = addDays(parseDate(dueDate), -(PREGNANCY_DAYS - week * 7));
  return d < now() ? addDays(now(), 7) : d;
}

export function AppointmentSheet({ target, onClose }: { target: AppointmentTarget | null; onClose: () => void }) {
  const apply = useWeave((s) => s.apply);
  const dueDate = useWeave((s) => s.domain.her.pregnancy?.dueDate);
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!target) return;
    setTried(false);
    if (target.kind === 'edit' && target.appointment.at) {
      const at = parseDate(target.appointment.at);
      setTitle(target.appointment.title);
      setDate(toISODate(at));
      setTime(format(at, 'HH:mm'));
    } else if (target.kind === 'book') {
      setTitle(target.milestone.title.text);
      setDate(toISODate(dueDate ? suggestedDate(dueDate, target.milestone.suggestedWeek) : addDays(now(), 7)));
      setTime('10:00');
    } else {
      setTitle('');
      setDate(toISODate(addDays(now(), 7)));
      setTime('10:00');
    }
  }, [target, dueDate]);

  const titleMissing = !title.trim();
  const past = !date || date < toISODate(now());
  const save = () => {
    setTried(true);
    if (titleMissing || past || !target) return;
    const at = new Date(`${date}T${time || '10:00'}:00`).toISOString();
    if (target.kind === 'edit') apply((s) => updateAppointment(s, target.appointment.id, { title, at }));
    else apply((s) => addAppointment(s, { title, at, milestoneId: target.kind === 'book' ? target.milestone.id : undefined }).state);
    toast(fmt(S.toastApptSaved, { title: title.trim(), date: formatLongDate(date) }));
    onClose();
  };

  const heading = !target ? '' : target.kind === 'edit' ? S.apptEditTitle.text : target.kind === 'book' ? fmt(S.apptBookTitle, { name: target.milestone.title.text.toLowerCase() }) : S.apptAddTitle.text;
  return (
    <BottomSheet open={Boolean(target)} onOpenChange={(o) => !o && onClose()} title={heading} onSave={save} dirty={target?.kind === 'new' && Boolean(title)}>
      <form className="flex flex-col gap-5 pb-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
        {target?.kind === 'book' ? <Copy as="p" entry={S.apptSuggestedHint} params={{ n: target.milestone.suggestedWeek }} className="font-sans text-[13px] text-ink-2" /> : null}
        <Field label={S.apptWhat.text} error={tried && titleMissing ? S.apptTitleError.text : undefined}>
          <input className={fieldCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={S.apptWhatPlaceholder.text} aria-invalid={tried && titleMissing} autoComplete="off" />
        </Field>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Field label={S.apptDate.text} error={tried && past ? S.apptPastError.text : undefined}>
            <input type="date" className={fieldCls} value={date} min={toISODate(now())} onChange={(e) => setDate(e.target.value)} aria-invalid={tried && past} />
          </Field>
          <Field label={S.apptTime.text}>
            <input type="time" className={fieldCls} value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        {target?.kind === 'edit' ? (
          <TextAction
            className="self-start !px-0 text-terracotta-ink"
            onClick={() => {
              apply((s) => removeAppointment(s, target.appointment.id));
              toast(fmt(S.toastApptRemoved, { title: target.appointment.title }));
              onClose();
            }}
          >
            {S.apptRemove.text}
          </TextAction>
        ) : null}
      </form>
    </BottomSheet>
  );
}
