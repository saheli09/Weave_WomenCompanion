import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import { PrimaryButton, SecondaryButton, TextAction } from '../../components/Button';
import { Field, fieldCls } from '../../components/Form';
import { FilterChip } from '../../components/Chip';
import { addDaysISO, calendarDaysBetween, childAge, formatDayMonth, PREGNANCY_DAYS, pregnancyWeek, toISODate } from '../../domain/dates';
import { STAGE_CONFIG } from '../../domain/stage';
import { onboard, updateSettings, type Situation } from '../../domain/transitions';
import type { FeedingMode, ISODate } from '../../domain/types';
import { useWeave } from '../../state/store';
import { now as clockNow } from '../../state/clock';
import { useToast } from '../../app/Toast';
import { SituationGlyph, StageThreads, ThreadProgress } from './Threads';

/**
 * Onboarding (B01, 9.13). A fresh install opens here. Three screens for every
 * path: welcome with sign-in, where are you now, the few facts needed. The
 * rest has a default (feeding from the child's age, units from the phone's
 * region) and lives in Settings, as in Flo, Clue and Huckleberry. Then
 * straight to the right Today, which greets her once.
 */

type Kind = Situation['kind'];
const STEPS = 3;

/** ml and kg, except where the phone's region weighs in ounces and pounds. */
export function unitsForLocale(locale: string | undefined): { volume: 'ml' | 'oz'; weight: 'kg' | 'lb' } {
  const imperial = /-(US|LR|MM)\b/i.test(locale ?? '');
  return imperial ? { volume: 'oz', weight: 'lb' } : { volume: 'ml', weight: 'kg' };
}

const SITUATIONS: { kind: Kind; label: string; hint: string }[] = [
  { kind: 'tracking_cycle', label: S.onbTracking.text, hint: S.onbTrackingHint.text },
  { kind: 'pregnant', label: S.onbPregnant.text, hint: S.onbPregnantHint.text },
  { kind: 'have_baby', label: S.onbHaveBaby.text, hint: S.onbHaveBabyHint.text },
  { kind: 'pregnant_with_child', label: S.onbPregnantWithChild.text, hint: S.onbPregnantWithChildHint.text },
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

  const go = (to: number) => {
    setTried(false);
    setStep(to);
  };

  // Accounts are UI only in this prototype (PRD: no backend), so signing in says so and carries on.
  const signIn = () => {
    toast(S.onbAccountToast.text);
    go(2);
  };

  const sample = () => {
    useWeave.getState().loadPersona('D3');
    navigate('/today', { replace: true });
    toast(S.onbSampleToast.text);
  };

  const finish = () => {
    setTried(true);
    if (!factsOk) return;
    const child = { name: childName.trim(), dob, feeding: feedingForAge(dob, now) };
    const situation: Situation =
      kind === 'pregnant'
        ? { kind, dueDate: dueISO }
        : kind === 'have_baby'
          ? { kind, child }
          : kind === 'pregnant_with_child'
            ? { kind, dueDate: dueISO, child }
            : { kind: 'tracking_cycle', lastPeriodStart: lastPeriod || undefined, ongoing: askOngoing && periodOngoing };
    useWeave.getState().apply((_s, at) =>
      updateSettings(onboard(name.trim(), situation, at), { units: unitsForLocale(navigator.language) }),
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
            <div className="flex flex-col gap-2 pt-2">
              <p className="font-sans text-[13px] text-ink-2">{S.onbPrivacyLine.text}</p>
              <p className="font-sans text-[13px] text-ink-2">{S.onbCareBody.text}</p>
            </div>
          </div>
        ) : null}

      </div>

      <div className="flex flex-col items-center gap-2">
        {step === 1 ? (
          <>
            <PrimaryButton size="lg" tone="ink" onClick={signIn}>
              <GoogleMark />
              {S.onbGoogle.text}
            </PrimaryButton>
            <SecondaryButton size="lg" className="text-[16px]! font-semibold" onClick={signIn}>
              <AppleMark />
              {S.onbApple.text}
            </SecondaryButton>
            <TextAction onClick={() => go(2)}>{S.onbNoAccount.text}</TextAction>
            {onboarded ? <TextAction onClick={() => navigate(-1)}>{S.back.text}</TextAction> : <TextAction onClick={sample}>{S.onbSample.text}</TextAction>}
          </>
        ) : step < STEPS ? (
          <PrimaryButton size="lg" tone="ink" disabled={!kind} onClick={() => go(3)}>
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

/** Google's four-colour G, drawn small beside the label. */
function GoogleMark() {
  return (
    <svg aria-hidden width={18} height={18} viewBox="0 0 48 48" className="mr-2 inline-block rounded-full bg-white p-[2px] align-[-4px]">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg aria-hidden width={16} height={18} viewBox="0 0 814 1000" className="mr-2 inline-block align-[-3px]" fill="currentColor">
      <path d="M788 341c-6 4-108 62-108 190 0 148 130 200 134 202-1 3-21 72-69 142-43 62-88 124-156 124s-86-40-165-40c-77 0-104 41-166 41s-106-57-156-127C44 791 0 668 0 551c0-187 122-287 241-287 64 0 117 42 157 42 38 0 98-45 171-45 28 0 128 3 194 80zM565 166c30-35 51-85 51-134 0-7-1-14-2-19-48 2-106 32-140 73-27 31-53 81-53 131 0 8 1 15 2 18 3 1 9 2 14 2 44 0 99-29 128-71z" />
    </svg>
  );
}
