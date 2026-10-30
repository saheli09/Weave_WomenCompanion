import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { S } from '../../content/strings';
import { t } from '../../components/Copy';
import { BottomSheet } from '../../components/Sheet';
import { FilterChip } from '../../components/Chip';
import { Field, fieldCls } from '../../components/Form';
import { PrimaryButton, TextAction } from '../../components/Button';
import { ReviewFlag } from '../../components/ReviewFlag';
import { AFTER_BIRTH, BAG_ITEM_IDS, birthPrepReview, FEEDING, HOSPITAL_BAG, PAIN_RELIEF } from '../../content/birthPrep';
import { setChecklist } from '../../domain/transitions';
import type { BirthPlan, DomainState } from '../../domain/types';
import { useDomain, useWeave } from '../../state/store';
import { useToast } from '../../app/Toast';

/**
 * The This week checklist's two sheets (9.5, decision 2026-10-30): a hospital
 * bag packing list and a short birth plan. The rows on Pregnancy Today show
 * where each stands and open these.
 */

type Checklist = NonNullable<NonNullable<DomainState['her']['pregnancy']>['checklist']>;
const EMPTY: Checklist = { birthPlanShared: false, hospitalBag: 'not_started' };

export const checklistOf = (state: DomainState): Checklist => state.her.pregnancy?.checklist ?? EMPTY;

/** Packed item ids. A checklist saved before items existed counts as all or none. */
export function packedItems(c: Checklist): string[] {
  return c.bagItems ?? (c.hospitalBag === 'packed' ? BAG_ITEM_IDS : []);
}

/** "Not started", "5 of 16 packed" or "Packed". */
export function bagValue(c: Checklist): string {
  const n = packedItems(c).length;
  if (!n) return S.notStarted.text;
  if (n >= BAG_ITEM_IDS.length) return S.packed.text;
  return t(S.bagProgress, { n, total: BAG_ITEM_IDS.length });
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
  const packed = packedItems(checklistOf(state));
  const toggle = (id: string) => {
    const next = packed.includes(id) ? packed.filter((x) => x !== id) : [...packed, id];
    apply((s) => setChecklist(s, { bagItems: next, hospitalBag: next.length >= BAG_ITEM_IDS.length ? 'packed' : 'not_started' }));
  };
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={S.hospitalBag.text}>
      <div className="flex flex-col gap-5 pb-2">
        <p data-testid="bag-progress" className="type-micro text-ink-2">
          {t(S.bagProgress, { n: packed.length, total: BAG_ITEM_IDS.length })}
        </p>
        <ReviewFlag review={birthPrepReview} className="rounded-card">
          <div className="flex flex-col gap-5">
            {HOSPITAL_BAG.map((g) => (
              <fieldset key={g.id} className="flex flex-col">
                <legend className="mb-1 font-sans text-[13px] font-semibold text-ink">{g.label.text}</legend>
                {g.items.map((it) => (
                  <label key={it.id} className="flex min-h-[48px] items-center gap-3 border-b border-line last:border-b-0">
                    <input type="checkbox" checked={packed.includes(it.id)} onChange={() => toggle(it.id)} className="size-5 shrink-0 accent-[var(--color-sage-600)]" />
                    <span className={`type-row ${packed.includes(it.id) ? 'text-ink-3 line-through' : 'text-ink'}`}>{it.label.text}</span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        </ReviewFlag>
      </div>
    </BottomSheet>
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
