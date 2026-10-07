import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays } from 'date-fns';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import { PrimaryButton, TextAction } from '../../components/Button';
import { Field, fieldCls } from '../../components/Form';
import { FilterChip } from '../../components/Chip';
import { ListCard, ListRow } from '../../components/Cards';
import { toISODate } from '../../domain/dates';
import { onboard, updateSettings, type Situation } from '../../domain/transitions';
import type { FeedingMode } from '../../domain/types';
import { useWeave } from '../../state/store';
import { now as clockNow } from '../../state/clock';

/**
 * Onboarding (B01, 9.13), five screens or fewer: welcome, where are you now,
 * the few facts needed, feeding and units, privacy. Then straight to Today.
 */

type Kind = Situation['kind'];

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<Kind | null>(null);
  const [name, setName] = useState('');
  const [due, setDue] = useState(toISODate(addDays(clockNow(), 7 * 20)));
  const [childName, setChildName] = useState('');
  const [dob, setDob] = useState('');
  const [lastPeriod, setLastPeriod] = useState('');
  const [feeding, setFeeding] = useState<FeedingMode[]>(['breast']);
  const [volume, setVolume] = useState<'ml' | 'oz'>('ml');
  const [weight, setWeight] = useState<'kg' | 'lb'>('kg');
  const [tried, setTried] = useState(false);
  const hasChild = kind === 'have_baby' || kind === 'pregnant_with_child';
  const pregnant = kind === 'pregnant' || kind === 'pregnant_with_child';

  const factsOk = Boolean(name.trim()) && (!pregnant || Boolean(due)) && (!hasChild || (Boolean(childName.trim()) && Boolean(dob)));
  const next = () => {
    if (step === 3) {
      setTried(true);
      if (!factsOk) return;
    }
    setStep((s) => (step === 3 && !hasChild ? 5 : s + 1));
  };
  const finish = () => {
    const child = { name: childName.trim(), dob, feeding };
    const situation: Situation =
      kind === 'pregnant'
        ? { kind, dueDate: due }
        : kind === 'have_baby'
          ? { kind, child }
          : kind === 'pregnant_with_child'
            ? { kind, dueDate: due, child }
            : { kind: 'tracking_cycle', lastPeriodStart: lastPeriod || undefined };
    useWeave.setState({ personaId: null });
    useWeave.getState().apply((_s, at) => updateSettings(onboard(name.trim(), situation, at), { units: { volume, weight } }));
    navigate('/today', { replace: true });
  };

  const step2: { kind: Kind; label: string }[] = [
    { kind: 'pregnant', label: S.onbPregnant.text },
    { kind: 'have_baby', label: S.onbHaveBaby.text },
    { kind: 'tracking_cycle', label: S.onbTracking.text },
    { kind: 'pregnant_with_child', label: S.onbPregnantWithChild.text },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col justify-between gap-8" data-screen="onboarding" data-step={step}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          {step > 1 ? (
            <button type="button" onClick={() => setStep((s) => (s === 5 && !hasChild ? 3 : s - 1))} className="hit-44 type-micro text-ink-3">
              ‹ {S.back.text}
            </button>
          ) : (
            <span />
          )}
          <span className="font-sans text-[11px] text-ink-2" aria-label={fmt(S.onbStep, { n: step })}>
            {step} / 5
          </span>
        </div>
        {step === 1 ? (
          <div className="flex flex-col gap-4 pt-16">
            <h1 className="type-greeting text-[32px] text-ink">{S.onbWelcomeTitle.text}</h1>
            <p className="type-body text-[16px] text-ink-2">{S.onbWelcomeBody.text}</p>
            <p className="font-sans text-[12px] text-ink-2">{S.onbReplaceNote.text}</p>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="flex flex-col gap-5">
            <h1 className="type-greeting text-ink">{S.onbWhereTitle.text}</h1>
            <div role="radiogroup" className="flex flex-col gap-2">
              {step2.map((o) => (
                <button
                  key={o.kind}
                  type="button"
                  role="radio"
                  aria-checked={kind === o.kind}
                  onClick={() => setKind(o.kind)}
                  className={`flex min-h-[56px] items-center rounded-list border px-4 text-left font-sans text-[15px] font-medium ${kind === o.kind ? 'border-ink bg-surface text-ink' : 'border-line bg-surface text-ink-2'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="flex flex-col gap-5">
            <h1 className="type-greeting text-ink">{S.onbFactsTitle.text}</h1>
            <Field label={S.onbYourName.text} error={tried && !name.trim() ? S.onbNameError.text : undefined}>
              <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
            </Field>
            {pregnant ? (
              <Field label={S.onbDueDate.text} error={tried && !due ? S.onbDateError.text : undefined}>
                <input type="date" className={fieldCls} value={due} onChange={(e) => setDue(e.target.value)} />
              </Field>
            ) : null}
            {hasChild ? (
              <>
                <Field label={S.onbChildName.text} error={tried && !childName.trim() ? S.onbChildNameError.text : undefined}>
                  <input className={fieldCls} value={childName} onChange={(e) => setChildName(e.target.value)} />
                </Field>
                <Field label={S.onbChildDob.text} error={tried && !dob ? S.onbDateError.text : undefined}>
                  <input type="date" className={fieldCls} value={dob} max={toISODate(clockNow())} onChange={(e) => setDob(e.target.value)} />
                </Field>
              </>
            ) : null}
            {kind === 'tracking_cycle' ? (
              <Field label={S.onbLastPeriod.text}>
                <input type="date" className={fieldCls} value={lastPeriod} max={toISODate(clockNow())} onChange={(e) => setLastPeriod(e.target.value)} />
              </Field>
            ) : null}
          </div>
        ) : null}
        {step === 4 ? (
          <div className="flex flex-col gap-5">
            <h1 className="type-greeting text-ink">{S.onbFeedingTitle.text}</h1>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 font-sans text-[13px] font-semibold text-ink">{S.onbFeeding.text}</legend>
              <div className="flex flex-wrap gap-2">
                {(['breast', 'bottle', 'solids'] as FeedingMode[]).map((f) => (
                  <FilterChip key={f} selected={feeding.includes(f)} onClick={() => setFeeding((xs) => (xs.includes(f) ? xs.filter((x) => x !== f) : [...xs, f]))}>
                    {f === 'breast' ? S.breastfeed.text : f === 'bottle' ? S.bottleFeed.text : S.solids.text}
                  </FilterChip>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}
        {step === 4 || (step === 5 && !hasChild) ? (
          <ListCard>
            <li className="flex min-h-[52px] items-center justify-between gap-3">
              <span className="type-row text-ink">{S.settingsVolume.text}</span>
              <span className="flex gap-2">
                {(['ml', 'oz'] as const).map((u) => (
                  <FilterChip key={u} selected={volume === u} onClick={() => setVolume(u)}>
                    {u}
                  </FilterChip>
                ))}
              </span>
            </li>
            <li className="flex min-h-[52px] items-center justify-between gap-3">
              <span className="type-row text-ink">{S.settingsWeight.text}</span>
              <span className="flex gap-2">
                {(['kg', 'lb'] as const).map((u) => (
                  <FilterChip key={u} selected={weight === u} onClick={() => setWeight(u)}>
                    {u}
                  </FilterChip>
                ))}
              </span>
            </li>
          </ListCard>
        ) : null}
        {step === 5 ? (
          <div className="flex flex-col gap-4">
            <h1 className="type-greeting text-ink">{S.onbPrivacyTitle.text}</h1>
            <p className="type-body text-[16px] text-ink-2">{S.onbPrivacyBody.text}</p>
            <ListCard>
              <ListRow label={S.onbYourName.text} value={name} />
            </ListCard>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col items-center gap-3">
        {step < 5 ? (
          <PrimaryButton size="lg" tone="ink" disabled={step === 2 && !kind} onClick={step === 1 ? () => setStep(2) : next}>
            {step === 1 ? S.onbStart.text : S.onbNext.text}
          </PrimaryButton>
        ) : (
          <PrimaryButton size="lg" tone="sage" onClick={finish}>
            {S.onbFinish.text}
          </PrimaryButton>
        )}
        {step === 1 ? <TextAction onClick={() => navigate(-1)}>{S.back.text}</TextAction> : null}
      </div>
    </div>
  );
}
