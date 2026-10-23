import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { BottomSheet } from '../../components/Sheet';
import { FilterChip } from '../../components/Chip';
import { NumberStepper } from '../../components/Stepper';
import { Field, fieldCls } from '../../components/Form';
import { TextAction } from '../../components/Button';
import { S } from '../../content/strings';
import type { LogEntry } from '../../domain/types';
import { removeLog, updateLog } from '../../domain/transitions';
import { useDomain, useWeave } from '../../state/store';
import { timelineText } from '../../state/selectors';
import { useToast } from '../../app/Toast';

/**
 * Edit or delete an older entry (10.3: "via the timeline row"). Time and note
 * for every type; the value itself for the quick types.
 */
export function EditLogSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const state = useDomain();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const entry = state.logs.find((l) => l.id === id);
  const [draft, setDraft] = useState<LogEntry | null>(null);
  const [when, setWhen] = useState('');
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    setDraft(entry ?? null);
    setWhen(entry ? format(new Date(entry.at), "yyyy-MM-dd'T'HH:mm") : '');
    setConfirm(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  if (!entry || !draft) return null;

  const set = (patch: Partial<LogEntry>) => setDraft({ ...draft, ...patch } as LogEntry);
  const save = () => {
    const at = new Date(when);
    const patch = { ...draft, at: Number.isNaN(at.getTime()) ? entry.at : at.toISOString() } as LogEntry;
    if (patch.type === 'sleep' && patch.end && entry.type === 'sleep') {
      // Moving a sleep moves its end; keep the duration.
      const shift = new Date(patch.at).getTime() - new Date(entry.at).getTime();
      patch.end = new Date(new Date(entry.end!).getTime() + shift).toISOString();
      patch.start = new Date(new Date(entry.start).getTime() + shift).toISOString();
    }
    try {
      apply((s) => updateLog(s, entry.id, patch));
      toast(S.toastEntrySaved.text);
      onClose();
    } catch {
      /* invalid values are prevented by the controls */
    }
  };
  const del = () => {
    if (!confirm) return setConfirm(true);
    const removed = entry;
    apply((s) => removeLog(s, removed.id));
    toast(S.toastEntryDeleted.text, () => apply((s) => ({ ...s, logs: [...s.logs, removed] })));
    onClose();
  };

  const chips = <T extends string>(values: readonly T[], value: T, onPick: (v: T) => void) => (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {values.map((v) => (
        <FilterChip key={v} role="radio" aria-checked={value === v} selected={value === v} onClick={() => onPick(v)}>
          {v.charAt(0).toUpperCase() + v.slice(1)}
        </FilterChip>
      ))}
    </div>
  );

  return (
    <BottomSheet open={Boolean(id)} onOpenChange={(o) => !o && onClose()} title={S.editEntryTitle.text} subtitle={timelineText(entry, state)} onSave={save}>
      <div className="flex flex-col gap-5 pb-2">
        <Field label={S.entryWhen.text}>
          <input type="datetime-local" className={fieldCls} value={when} onChange={(e) => setWhen(e.target.value)} />
        </Field>
        {draft.type === 'diaper' ? chips(['wet', 'dirty', 'both'] as const, draft.kind, (kind) => set({ kind } as Partial<LogEntry>)) : null}
        {draft.type === 'bleeding' ? chips(['spotting', 'light', 'medium', 'heavy'] as const, draft.level, (level) => set({ level } as Partial<LogEntry>)) : null}
        {draft.type === 'mood' ? chips(['low', 'flat', 'ok', 'good'] as const, draft.value, (value) => set({ value } as Partial<LogEntry>)) : null}
        {draft.type === 'water' ? <NumberStepper value={draft.glasses} onChange={(glasses) => set({ glasses } as Partial<LogEntry>)} step={1} min={1} max={8} format={String} label={S.glassesLabel.text} /> : null}
        {draft.type === 'feed' && draft.mode === 'bottle' ? <NumberStepper value={draft.ml} onChange={(ml) => set({ ml } as Partial<LogEntry>)} step={10} min={10} max={400} format={(v) => `${v} ml`} label={S.amount.text} /> : null}
        {draft.type === 'feed' && draft.mode === 'breast' ? <NumberStepper value={draft.minutes} onChange={(minutes) => set({ minutes } as Partial<LogEntry>)} step={1} min={1} max={90} format={(v) => `${v} m`} label={S.minutesLabel.text} /> : null}
        <Field label={S.notes.text}>
          <input className={fieldCls} value={draft.note ?? ''} onChange={(e) => set({ note: e.target.value || undefined })} />
        </Field>
        {confirm ? <p role="alert" className="font-sans text-[13px] font-medium text-terracotta-ink">{S.entryDeleteConfirm.text}</p> : null}
        <TextAction className="self-start !px-0 text-terracotta-ink" onClick={del}>
          {confirm ? S.entryDeleteYes.text : S.entryDelete.text}
        </TextAction>
      </div>
    </BottomSheet>
  );
}
