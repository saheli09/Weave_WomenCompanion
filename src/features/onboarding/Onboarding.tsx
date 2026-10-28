import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import { PrimaryButton, TextAction } from '../../components/Button';
import { Field, FieldError, fieldCls } from '../../components/Form';
import { FilterChip } from '../../components/Chip';
import { ListCard, ListRow } from '../../components/Cards';
import { addDaysISO, calendarDaysBetween, childAge, formatDayMonth, PREGNANCY_DAYS, pregnancyWeek, toISODate } from '../../domain/dates';
import { STAGE_CONFIG } from '../../domain/stage';
import { onboard, updateSettings, type Situation } from '../../domain/transitions';
import type { FeedingMode, ISODate } from '../../domain/types';
import { useWeave } from '../../state/store';
import { now as clockNow } from '../../state/clock';
import { useToast } from '../../app/Toast';
import { SituationGlyph, StageDot, StageThreads, ThreadProgress, WeaveMark } from './Threads';

/**
 * Onboarding (B01, 9.13). A fresh install opens here. Five screens for every
 * path, so the progress never skips: welcome, where are you now, the few facts
 * needed, preferences (feeding, units, who shares the load), privacy with a
 * summary. Then straight to the right Today, which greets her once.
 */

type Kind = Situation['kind'];
const STEPS = 5;

const SITUATIONS: { kind: Kind; label: string; hint: string }[] = [
  { kind: 'pregnant', label: S.onbPregnant.text, hint: S.onbPregnantHint.text },
  { kind: 'have_baby', label: S.onbHaveBaby.text, hint: S.onbHaveBabyHint.text },
  { kind: 'pregnant_with_child', label: S.onbPregnantWithChild.text, hint: S.onbPregnantWithChildHint.text },
  { kind: 'tracking_cycle', label: S.onbTracking.text, hint: S.onbTrackingHint.text },
];

/** "26 days", "7 weeks", "14 months", "2 years": how she would say it. */
export function ageWords(dob: ISODate, now: Date): string {
  const a = childAge(dob, now);
  const n = (k: number, unit: string) => `${k} ${unit}${k === 1 ? '' : 's'}`;
  if (a.totalDays < 14) return n(a.totalDays, 'day');
  if (a.totalDays < 91) return n(Math.floor(a.totalDays / 7), 'week');
  if (a.totalMonths < 24) return n(a.totalMonths, 'month');
  return n(a.years, 'year');
}

/** Default feeding from age, until she changes it: breast, then solids from six months, solids only from a year. */
export function feedingForAge(dob: ISODate, now: Date): FeedingMode[] {
  const months = childAge(dob, now).totalMonths;
  if (months >= STAGE_CONFIG.toddlerFromMonths) return ['solids'];
  if (months >= STAGE_CONFIG.solidsFromMonths) return ['breast', 'solids'];
  return ['breast'];
}

export function Onboarding() {
  const navigate = useNavigate();
  const toast = useToast();
  const onboarded = useWeave((s) => s.onboarded);
  const now = clockNow();
  const today = toISODate(now);

  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<Kind | null>(null);
  const [name, setName] = useState('');
  const [dueMode, setDueMode] = useState<'due' | 'lmp'>('due');
  const [due, setDue] = useState('');
  const [lmp, setLmp] = useState('');
  const [childName, setChildName] = useState('');
  const [dob, setDob] = useState('');
  const [lastPeriod, setLastPeriod] = useState('');
  const [periodOngoing, setPeriodOngoing] = useState(true);
  const [feeding, setFeeding] = useState<FeedingMode[]>(['breast']);
  const [feedingTouched, setFeedingTouched] = useState(false);
  const [volume, setVolume] = useState<'ml' | 'oz'>('ml');
  const [weight, setWeight] = useState<'kg' | 'lb'>('kg');
  const [partner, setPartner] = useState('');
  const [tried, setTried] = useState(false);

  const hasChild = kind === 'have_baby' || kind === 'pregnant_with_child';
  const pregnant = kind === 'pregnant' || kind === 'pregnant_with_child';

  // Pregnancy: a due date, or one worked out from her last period (280 days).
  const dueISO = dueMode === 'due' ? due : lmp ? addDaysISO(lmp, PREGNANCY_DAYS) : '';
  const gestation = dueISO ? pregnancyWeek(dueISO, now) : undefined;
  const dueInRange = Boolean(gestation && gestation.gestationalDays >= 0 && gestation.gestationalDays <= 42 * 7);
  const dueError = !pregnant ? undefined : !dueISO ? (tried ? S.onbDateError.text : undefined) : dueInRange ? undefined : S.onbDueRangeError.text;

  const dobFuture = Boolean(dob) && dob > today;
  const dobError = !hasChild ? undefined : dobFuture ? S.onbFutureError.text : tried && !dob ? S.onbDateError.text : undefined;
  const periodFuture = Boolean(lastPeriod) && lastPeriod > today;

  const factsOk =
    Boolean(name.trim()) &&
    (!pregnant || dueInRange) &&
    (!hasChild || (Boolean(childName.trim()) && Boolean(dob) && !dobFuture)) &&
    !(kind === 'tracking_cycle' && periodFuture);
  const prefsOk = !hasChild || feeding.length > 0;

  const go = (to: number) => {
    setTried(false);
    setStep(to);
  };
  const next = () => {
    if (step === 3 || step === 4) {
      setTried(true);
      if (step === 3 ? !factsOk : !prefsOk) return;
      if (step === 3 && hasChild && !feedingTouched) setFeeding(feedingForAge(dob, now));
    }
    go(step + 1);
  };

  const sample = () => {
    useWeave.getState().loadPersona('D3');
    navigate('/today', { replace: true });
    toast(S.onbSampleToast.text);
  };

  const finish = () => {
    const child = { name: childName.trim(), dob, feeding };
    const situation: Situation =
      kind === 'pregnant'
        ? { kind, dueDate: dueISO }
        : kind === 'have_baby'
          ? { kind, child }
          : kind === 'pregnant_with_child'
            ? { kind, dueDate: dueISO, child }
            : { kind: 'tracking_cycle', lastPeriodStart: lastPeriod || undefined, ongoing: askOngoing && periodOngoing };
    useWeave.getState().apply((_s, at) =>
      updateSettings(onboard(name.trim(), situation, at), { units: { volume, weight }, partnerName: partner.trim() || undefined }),
    );
    useWeave.setState({ personaId: null, onboarded: true });
    navigate('/today', { replace: true });
  };

  const factsTitle = kind === 'have_baby' ? S.onbFactsBaby.text : kind === 'pregnant_with_child' ? S.onbFactsChild.text : S.onbFactsYou.text;
  const childLine = hasChild && dob && !dobFuture && childName.trim() ? fmt(S.onbChildLine, { name: childName.trim(), age: ageWords(dob, now) }) : undefined;
  const pregnancyLine = pregnant && dueInRange ? fmt(S.onbPregnancyLine, { week: gestation!.week, date: formatDayMonth(dueISO) }) : undefined;
  const cycleDay = kind === 'tracking_cycle' && lastPeriod && !periodFuture ? calendarDaysBetween(lastPeriod, now) + 1 : undefined;
  // Only a period that began in the last week might still be going; older ones count as finished.
  const askOngoing = Boolean(cycleDay && cycleDay <= 7);

  return (
    <div className="flex min-h-full flex-1 flex-col justify-between gap-8" data-screen="onboarding" data-step={step}>
      <div className="flex flex-col gap-6">
        {step > 1 ? (
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => go(step - 1)} className="hit-44 type-micro shrink-0 text-ink-3">
              ‹ {S.back.text}
            </button>
            <ThreadProgress step={step} steps={STEPS} label={fmt(S.onbStep, { n: step })} />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-7 pt-4">
            <div className="-mx-5">
              <StageThreads />
            </div>
            <div className="flex flex-col gap-4">
              <h1 className="type-greeting text-[32px] text-ink">{S.onbWelcomeTitle.text}</h1>
              <p className="type-body text-[16px] text-ink-2">{S.onbWelcomeBody.text}</p>
            </div>
            <Thread />
            {onboarded ? <p className="font-sans text-[12px] text-ink-2">{S.onbReplaceNote.text}</p> : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-5">
            <h1 className="type-greeting text-ink">{S.onbWhereTitle.text}</h1>
            <div role="radiogroup" aria-label={S.onbWhereTitle.text} className="flex flex-col gap-2">
              {SITUATIONS.map((o) => {
                const on = kind === o.kind;
                return (
                  <button
                    key={o.kind}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={o.label}
                    onClick={() => setKind(o.kind)}
                    className={`flex min-h-[64px] items-center justify-between gap-3 rounded-list border bg-surface px-4 py-3 text-left ${on ? 'border-ink' : 'border-line'}`}
                  >
                    <SituationGlyph kind={o.kind} />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-sans text-[15px] font-semibold text-ink">{o.label}</span>
                      <span className="font-sans text-[13px] text-ink-2">{o.hint}</span>
                    </span>
                    <span aria-hidden className={`grid size-5 shrink-0 place-items-center rounded-full border ${on ? 'border-ink bg-ink' : 'border-ink-faint'}`}>
                      {on ? <span className="size-2 rounded-full bg-surface" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="font-sans text-[13px] text-ink-2">{S.onbWhereNote.text}</p>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-5">
            <h1 className="type-greeting text-ink">{factsTitle}</h1>
            <Field label={S.onbYourName.text} error={tried && !name.trim() ? S.onbNameError.text : undefined}>
              <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
            </Field>
            {pregnant ? (
              <div className="flex flex-col gap-1">
                {dueMode === 'due' ? (
                  <Field label={S.onbDueDate.text} error={dueError} hint={pregnancyLine}>
                    <input type="date" className={fieldCls} value={due} min={addDaysISO(today, -14)} onChange={(e) => setDue(e.target.value)} />
                  </Field>
                ) : (
                  <Field label={S.onbLmp.text} error={dueError} hint={pregnancyLine}>
                    <input type="date" className={fieldCls} value={lmp} max={today} onChange={(e) => setLmp(e.target.value)} />
                  </Field>
                )}
                <TextAction className="self-start px-0 text-[13px]" onClick={() => setDueMode((m) => (m === 'due' ? 'lmp' : 'due'))}>
                  {dueMode === 'due' ? S.onbNoDueDate.text : S.onbUseDueDate.text}
                </TextAction>
              </div>
            ) : null}
            {hasChild ? (
              <>
                <Field label={S.onbChildName.text} error={tried && !childName.trim() ? S.onbChildNameError.text : undefined}>
                  <input className={fieldCls} value={childName} onChange={(e) => setChildName(e.target.value)} />
                </Field>
                <Field label={S.onbChildDob.text} error={dobError} hint={childLine}>
                  <input type="date" className={fieldCls} value={dob} max={today} onChange={(e) => setDob(e.target.value)} />
                </Field>
              </>
            ) : null}
            {kind === 'tracking_cycle' ? (
              <Field label={S.onbLastPeriod.text} error={periodFuture ? S.onbFutureError.text : undefined} hint={cycleDay ? fmt(S.onbCycleLine, { n: cycleDay }) : undefined}>
                <input type="date" className={fieldCls} value={lastPeriod} max={today} onChange={(e) => setLastPeriod(e.target.value)} />
              </Field>
            ) : null}
            {askOngoing ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 font-sans text-[13px] font-semibold text-ink">{S.onbPeriodOngoing.text}</legend>
                <div role="radiogroup" aria-label={S.onbPeriodOngoing.text} className="flex gap-2">
                  {[true, false].map((v) => (
                    <FilterChip key={String(v)} role="radio" selected={periodOngoing === v} onClick={() => setPeriodOngoing(v)}>
                      {v ? S.onbYes.text : S.onbNo.text}
                    </FilterChip>
                  ))}
                </div>
              </fieldset>
            ) : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="flex flex-col gap-6">
            <h1 className="type-greeting text-ink">{S.onbPrefsTitle.text}</h1>
            {hasChild ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 font-sans text-[13px] font-semibold text-ink">{fmt(S.onbFeeding, { name: childName.trim() })}</legend>
                <div className="flex flex-wrap gap-2">
                  {(['breast', 'bottle', 'solids'] as FeedingMode[]).map((f) => (
                    <FilterChip
                      key={f}
                      selected={feeding.includes(f)}
                      onClick={() => {
                        setFeedingTouched(true);
                        setFeeding((xs) => (xs.includes(f) ? xs.filter((x) => x !== f) : [...xs, f]));
                      }}
                    >
                      {f === 'breast' ? S.breastfeed.text : f === 'bottle' ? S.bottleFeed.text : S.solids.text}
                    </FilterChip>
                  ))}
                </div>
                <span className="font-sans text-[12px] text-ink-2">{S.onbFeedingHint.text}</span>
                <FieldError>{tried && !prefsOk ? S.onbFeedingError.text : undefined}</FieldError>
              </fieldset>
            ) : null}
            <div className="flex flex-col gap-2">
              <span className="font-sans text-[13px] font-semibold text-ink">{S.onbUnits.text}</span>
              <ListCard>
                <UnitRow label={S.settingsVolume.text} options={['ml', 'oz'] as const} value={volume} onChange={setVolume} />
                <UnitRow label={S.settingsWeight.text} options={['kg', 'lb'] as const} value={weight} onChange={setWeight} />
              </ListCard>
            </div>
            <Field label={S.onbPartner.text} hint={S.onbPartnerHint.text}>
              <input className={fieldCls} value={partner} onChange={(e) => setPartner(e.target.value)} autoComplete="off" />
            </Field>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="flex flex-col gap-5">
            <WeaveMark size={56} />
            <h1 className="type-greeting text-ink">{S.onbPrivacyTitle.text}</h1>
            <p className="type-body text-[16px] text-ink-2">{S.onbPrivacyBody.text}</p>
            <p className="type-body text-[16px] text-ink-2">{S.onbCareBody.text}</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-sans text-[13px] font-semibold text-ink">{S.onbSummary.text}</span>
                <TextAction className="text-[13px]" onClick={() => go(3)}>
                  {S.onbChange.text}
                </TextAction>
              </div>
              <ListCard>
                <ListRow label={S.onbSummaryYou.text} value={name.trim()} />
                {pregnancyLine ? <ListRow label={S.onbSummaryPregnancy.text} value={pregnancyLine} /> : null}
                {hasChild ? <ListRow label={childName.trim()} value={`${ageWords(dob, now)} old`} /> : null}
                {cycleDay ? <ListRow label={S.onbSummaryCycle.text} value={fmt(S.onbCycleLine, { n: cycleDay })} /> : null}
              </ListCard>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-2">
        {step === 1 ? (
          <>
            <PrimaryButton size="lg" tone="ink" onClick={() => go(2)}>
              {S.onbStart.text}
            </PrimaryButton>
            {onboarded ? <TextAction onClick={() => navigate(-1)}>{S.back.text}</TextAction> : <TextAction onClick={sample}>{S.onbSample.text}</TextAction>}
          </>
        ) : step < STEPS ? (
          <PrimaryButton size="lg" tone="ink" disabled={step === 2 && !kind} onClick={next}>
            {S.onbNext.text}
          </PrimaryButton>
        ) : (
          <PrimaryButton size="lg" tone="sage" onClick={finish}>
            {S.onbFinish.text}
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}

/** The stages Weave follows, each keyed to its thread in the drawing above. */
function Thread() {
  const stages = [S.onbThreadPregnancy, S.onbThreadBirth, S.onbThreadCycle, S.onbThreadChild];
  return (
    <ol aria-label={S.onbThreadA11y.text} className="flex flex-col gap-3">
      {stages.map((s, i) => (
        <li key={s.text} className="flex items-center gap-3 font-sans text-[15px] text-ink">
          <StageDot index={i} />
          {s.text}
        </li>
      ))}
    </ol>
  );
}

function UnitRow<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <li className="flex min-h-[52px] items-center justify-between gap-3">
      <span className="type-row text-ink">{label}</span>
      <span className="flex gap-2">
        {options.map((u) => (
          <FilterChip key={u} selected={value === u} onClick={() => onChange(u)}>
            {u}
          </FilterChip>
        ))}
      </span>
    </li>
  );
}

