import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { S } from '../../content/strings';
import { t } from '../../components/Copy';
import { BottomSheet } from '../../components/Sheet';
import { FilterChip } from '../../components/Chip';
import { Field, fieldCls } from '../../components/Form';
import { PrimaryButton, TextAction } from '../../components/Button';
import { ReviewFlag } from '../../components/ReviewFlag';
import { Icon } from '../../components/Icon';
import { AFTER_BIRTH, birthPrepReview, FEEDING, PAIN_RELIEF } from '../../content/birthPrep';
import { setChecklist } from '../../domain/transitions';
import type { BirthPlan, DomainState } from '../../domain/types';
import { useDomain, useWeave } from '../../state/store';
import { useToast } from '../../app/Toast';
import { addBagItem, bagIds, bagList, type Checklist, packedItems, removeBagItem, restoreBagItems, toggleBagItem } from './hospitalBag';

/**
 * The This week checklist's two sheets (9.5, decision 2026-10-30): a hospital
 * bag packing list and a short birth plan. The rows on Pregnancy Today show
 * where each stands and open these.
 */

const EMPTY: Checklist = { birthPlanShared: false, hospitalBag: 'not_started' };

export const checklistOf = (state: DomainState): Checklist => state.her.pregnancy?.checklist ?? EMPTY;
export { packedItems };

/** "Not started", "5 of 16 packed" or "Packed", counted on her own list. */
export function bagValue(c: Checklist): string {
  const n = packedItems(c).length;
  const total = bagIds(c).length;
  if (!n) return S.notStarted.text;
  if (n >= total) return S.packed.text;
  return t(S.bagProgress, { n, total });
}

/** Where, who, pain relief and feeding answered: Ready. Some: Started. Notes are optional. */
export function planStatus(plan: BirthPlan | undefined): 'not_started' | 'started' | 'ready' {
  const answered = [plan?.place?.trim(), plan?.companion?.trim(), plan?.painRelief?.length, plan?.feeding].filter(Boolean).length;
  return answered === 0 ? 'not_started' : answered === 4 ? 'ready' : 'started';
}

export function planValue(c: Checklist, partner?: string): string {
  if (c.birthPlanShared && partner) return t(S.sharedWith, { name: partner });
  const status = planStatus(c.birthPlan);
  return status === 'ready' ? S.planReady.text : status === 'started' ? S.planStarted.text : S.notStarted.text;
}

export function HospitalBagSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const state = useDomain();
  const apply = useWeave((s) => s.apply);
  const c = checklistOf(state);
  const groups = bagList(c);
  const packed = packedItems(c);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!open) setEditing(false);
  }, [open]);
  const change = (patch: (c: Checklist) => Partial<Checklist> | undefined) =>
    apply((s) => {
      const p = patch(checklistOf(s));
      return p ? setChecklist(s, p) : s;
    });
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={S.hospitalBag.text}>
      <div className="flex flex-col gap-5 pb-2">
        <div className="flex items-center justify-between gap-3">
          <p data-testid="bag-progress" className="type-micro text-ink-2">
            {t(S.bagProgress, { n: packed.length, total: bagIds(c).length })}
          </p>
          <TextAction className="!px-0 text-[13px] font-semibold text-sage-600" aria-pressed={editing} onClick={() => setEditing((e) => !e)}>
            {editing ? S.bagDone.text : S.bagEdit.text}
          </TextAction>
        </div>
        <ReviewFlag review={birthPrepReview} className="rounded-card">
          <div className="flex flex-col gap-5">
            {groups.map((g) => (
              <fieldset key={g.id} className="flex flex-col">
                <legend className="mb-1 font-sans text-[13px] font-semibold text-ink">{g.label}</legend>
                {g.items.map((it) =>
                  editing ? (
                    <div key={it.id} className="flex min-h-[48px] items-center justify-between gap-3 border-b border-line">
                      <span className="type-row text-ink">{it.label}</span>
                      <button
                        type="button"
                        aria-label={t(S.bagRemove, { item: it.label })}
                        onClick={() => change((c) => removeBagItem(c, it.id))}
                        className="flex size-11 shrink-0 items-center justify-center rounded-full active:bg-line/60"
                      >
                        <Icon name="close" size={14} color="var(--color-ink-2)" />
                      </button>
                    </div>
                  ) : (
                    <label key={it.id} className="flex min-h-[48px] items-center gap-3 border-b border-line">
                      <input type="checkbox" checked={packed.includes(it.id)} onChange={() => change((c) => toggleBagItem(c, it.id))} className="size-5 shrink-0 accent-[var(--color-sage-600)]" />
                      <span className={`type-row ${packed.includes(it.id) ? 'text-ink-3 line-through' : 'text-ink'}`}>{it.label}</span>
                    </label>
                  ),
                )}
                <AddBagItem group={g.label} onAdd={(text) => change((c) => addBagItem(c, g.id, text, `custom-${Date.now().toString(36)}-${c.bagCustom?.length ?? 0}`))} />
              </fieldset>
            ))}
          </div>
        </ReviewFlag>
        {editing && c.bagRemoved?.length ? (
          <TextAction className="self-start !px-0 text-[13px]" onClick={() => change(restoreBagItems)}>
            {S.bagRestore.text}
          </TextAction>
        ) : null}
      </div>
    </BottomSheet>
  );
}

/** "Add an item" at the foot of a group; opens a field that stays open for the next one. */
function AddBagItem({ group, onAdd }: { group: string; onAdd: (text: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  if (!adding) {
    return (
      <TextAction className="self-start !px-0 text-[14px] text-sage-600" aria-label={t(S.bagAddTo, { group })} onClick={() => setAdding(true)}>
        + {S.bagAdd.text}
      </TextAction>
    );
  }
  const submit = () => {
    if (text.trim()) onAdd(text);
    setText('');
  };
  return (
    <form
      className="flex items-center gap-2 pt-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        autoFocus
        aria-label={t(S.bagNewItem, { group })}
        className={`${fieldCls} flex-1`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => !text.trim() && setAdding(false)}
      />
      <PrimaryButton type="submit" tone="sage" disabled={!text.trim()}>
        {S.bagAddButton.text}
      </PrimaryButton>
    </form>
  );
}

function Chips({ label, options, selected, onToggle, multi = true }: { label: string; options: { text: string }[]; selected: string[]; onToggle: (v: string) => void; multi?: boolean }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-sans text-[13px] font-semibold text-ink">{label}</legend>
      <div role={multi ? 'group' : 'radiogroup'} aria-label={label} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <FilterChip key={o.text} role={multi ? undefined : 'radio'} aria-checked={multi ? undefined : selected.includes(o.text)} selected={selected.includes(o.text)} onClick={() => onToggle(o.text)}>
            {o.text}
          </FilterChip>
        ))}
      </div>
    </fieldset>
  );
}

export function BirthPlanSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const state = useDomain();
  const apply = useWeave((s) => s.apply);
  const navigate = useNavigate();
  const toast = useToast();
  const c = checklistOf(state);
  const partner = state.her.partnerName;
  const [plan, setPlan] = useState<BirthPlan>(c.birthPlan ?? {});
  const [shared, setShared] = useState(c.birthPlanShared);
  useEffect(() => {
    if (!open) return;
    setPlan({ companion: partner, ...c.birthPlan });
    setShared(c.birthPlanShared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const toggleIn = (key: 'painRelief' | 'afterBirth') => (v: string) =>
    setPlan((p) => ({ ...p, [key]: (p[key] ?? []).includes(v) ? (p[key] ?? []).filter((x) => x !== v) : [...(p[key] ?? []), v] }));
  const save = () => {
    apply((s) => setChecklist(s, { birthPlan: plan, birthPlanShared: Boolean(partner) && shared }));
    toast(S.toastPlanSaved.text);
    onOpenChange(false);
  };
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={S.birthPlan.text}>
      <div className="flex flex-col gap-5 pb-2">
        <p className="font-sans text-[13px] text-ink-2">{S.planIntro.text}</p>
        <Field label={S.planPlace.text}>
          <input className={fieldCls} value={plan.place ?? ''} onChange={(e) => setPlan((p) => ({ ...p, place: e.target.value }))} />
        </Field>
        <Field label={S.planCompanion.text}>
          <input className={fieldCls} value={plan.companion ?? ''} onChange={(e) => setPlan((p) => ({ ...p, companion: e.target.value }))} />
        </Field>
        <ReviewFlag review={birthPrepReview} className="rounded-card">
          <div className="flex flex-col gap-5">
            <Chips label={S.planPainRelief.text} options={PAIN_RELIEF} selected={plan.painRelief ?? []} onToggle={toggleIn('painRelief')} />
            <Chips label={S.planFeeding.text} options={FEEDING} selected={plan.feeding ? [plan.feeding] : []} onToggle={(v) => setPlan((p) => ({ ...p, feeding: p.feeding === v ? undefined : v }))} multi={false} />
            <Chips label={S.planAfterBirth.text} options={AFTER_BIRTH} selected={plan.afterBirth ?? []} onToggle={toggleIn('afterBirth')} />
          </div>
        </ReviewFlag>
        <Field label={S.planNotes.text}>
          <textarea className={`${fieldCls} min-h-[88px] py-3`} value={plan.notes ?? ''} onChange={(e) => setPlan((p) => ({ ...p, notes: e.target.value }))} />
        </Field>
        {partner ? (
          <label className="flex min-h-[52px] items-center justify-between gap-3 rounded-card bg-surface-muted px-4">
            <span className="type-row text-ink">{t(S.planShareWith, { name: partner })}</span>
            <input type="checkbox" role="switch" aria-checked={shared} checked={shared} onChange={(e) => setShared(e.target.checked)} className="size-6 accent-[var(--color-ink)]" />
          </label>
        ) : (
          <TextAction className="self-start !px-0 text-[13px]" onClick={() => (onOpenChange(false), navigate('/settings'))}>
            {S.planAddPartner.text}
          </TextAction>
        )}
        <PrimaryButton size="lg" tone="sage" onClick={save}>
          {S.save.text}
        </PrimaryButton>
      </div>
    </BottomSheet>
  );
}
