import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { addDays, addMonths, endOfMonth, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { S } from '../../content/strings';
import { Copy, t } from '../../components/Copy';
import { ListCard, ListRow, Section } from '../../components/Cards';
import { PrimaryButton, SecondaryButton, TextAction } from '../../components/Button';
import { BottomSheet } from '../../components/Sheet';
import { FilterChip } from '../../components/Chip';
import { Field, fieldCls } from '../../components/Form';
import { Chevron } from '../../components/Icon';
import { addDaysISO, formatDayMonth, formatLongDate, toISODate } from '../../domain/dates';
import { currentPeriodDay } from '../../domain/stage';
import { endPeriod, logPeriodDay, nextPeriodEstimate, periodRuns, removePeriodDay, cycleLengths } from '../../domain/cycle';
import { pregnantAgain } from '../../domain/transitions';
import type { BleedingLevel, DomainState, LogEntry } from '../../domain/types';
import { useDomain, useWeave } from '../../state/store';
import { now as clockNow, useNow } from '../../state/clock';
import { useToast } from '../../app/Toast';
import { commitLog } from '../../metrics/timeToLog';

/**
 * Cycle (B25, 9.8): month calendar with period days, a day-detail sheet for
 * flow and symptoms, End period, history, and an estimate only after two
 * complete cycles. Breastfeeding shows as context only.
 */

const FLOWS: BleedingLevel[] = ['spotting', 'light', 'medium', 'heavy'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function periodLogFor(state: DomainState, date: string) {
  return state.logs.find((l): l is Extract<LogEntry, { type: 'period' }> => l.type === 'period' && l.event !== 'end' && toISODate(new Date(l.at)) === date);
}

export function CycleScreen() {
  const state = useDomain();
  const now = useNow();
  const navigate = useNavigate();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const [month, setMonth] = useState(startOfMonth(now));
  const [day, setDay] = useState<string | null>(null);
  const [preg, setPreg] = useState(false);
  if (!state.her.cycle.active) return <Navigate to="/me" replace />;
  const days = state.her.cycle.periodDays ?? [];
  const periodDay = currentPeriodDay(state, now);
  const estimate = nextPeriodEstimate(days);
  const runs = periodRuns(days).reverse();
  const lengths = cycleLengths(days);
  const feeding = [...new Set(state.children.flatMap((c) => c.feeding))].join(', ');

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)).filter((d, i) => i < 35 || d <= endOfMonth(month));

  return (
    <div className="flex flex-col gap-6" data-screen="cycle">
      <div className="flex flex-col gap-5">
        <button type="button" onClick={() => navigate(-1)} className="hit-44 self-start type-micro text-ink-3">
          ‹ {S.back.text}
        </button>
        <h1 className="type-greeting text-ink">{S.cycleTitle.text}</h1>
      </div>

      <section className="flex flex-col gap-3 rounded-card bg-surface p-5">
        <h2 className="type-insight text-ink">{periodDay ? t(S.cyclePeriodDay, { n: periodDay }) : S.cycleNoPeriod.text}</h2>
        {estimate ? (
          <>
            <p className="font-sans text-[14px] text-ink">{t(S.cycleEstimate, { date: formatDayMonth(estimate) })}</p>
            <Copy as="p" entry={S.cycleEstimateNote} className="font-sans text-[12px] text-ink-2" />
          </>
        ) : (
          <Copy as="p" entry={S.cycleTooEarly} className="type-body text-ink-2" />
        )}
        {feeding ? <p className="font-sans text-[12px] text-ink-2">{t(S.cycleFeedingContext, { feeding })}</p> : null}
        <div className="flex flex-wrap gap-3 pt-1">
          <PrimaryButton tone="ink" onClick={() => setDay(toISODate(now))}>
            {S.cycleLogToday.text}
          </PrimaryButton>
          {periodDay ? (
            <TextAction onClick={() => (apply((s, at) => endPeriod(s, at)), toast(S.toastPeriodEnded.text))}>{S.cycleEndPeriod.text}</TextAction>
          ) : null}
        </div>
      </section>

      <section aria-label={format(month, 'MMMM yyyy')} className="flex flex-col gap-3 rounded-card bg-surface p-4">
        <div className="flex items-center justify-between">
          <button type="button" aria-label={S.cyclePrevMonth.text} onClick={() => setMonth((m) => addMonths(m, -1))} className="grid size-11 rotate-180 place-items-center text-ink-2">
            <Chevron />
          </button>
          <h2 className="type-insight-sm text-ink">{format(month, 'MMMM yyyy')}</h2>
          <button type="button" aria-label={S.cycleNextMonth.text} disabled={isSameMonth(month, now)} onClick={() => setMonth((m) => addMonths(m, 1))} className="grid size-11 place-items-center text-ink-2 disabled:opacity-30">
            <Chevron />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center font-sans text-[11px] text-ink-2" aria-hidden>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div role="grid" aria-label={format(month, 'MMMM yyyy')} className="flex flex-col gap-y-1">
          {Array.from({ length: Math.ceil(cells.length / 7) }, (_, r) => cells.slice(r * 7, r * 7 + 7)).map((week) => (
            <div role="row" key={toISODate(week[0]!)} className="grid grid-cols-7">
          {week.map((d) => {
            const iso = toISODate(d);
            const inMonth = isSameMonth(d, month);
            const period = days.includes(iso);
            const flow = period ? periodLogFor(state, iso)?.flow : undefined;
            const isToday = isSameDay(d, now);
            const future = d > now;
            const isEstimate = estimate && iso >= estimate && iso < addDaysISO(estimate, 4) && !period;
            return (
              <button
                key={iso}
                type="button"
                role="gridcell"
                disabled={future}
                aria-label={t(S.cycleDayA11y, { date: formatLongDate(d), state: `${period ? t(S.cycleDayPeriod, { flow: flow ?? 'logged' }) : ''}${isToday ? S.cycleDayToday.text : ''}` })}
                onClick={() => setDay(iso)}
                className={`mx-auto grid size-11 place-items-center rounded-full font-sans text-[13px] tabular-nums ${!inMonth ? 'text-ink-faint' : future ? 'text-ink-faint' : 'text-ink'} ${period ? 'bg-chip-her-bg font-semibold text-chip-her-fg' : ''} ${isToday ? 'ring-1 ring-ink' : ''} ${isEstimate ? 'border border-dashed border-chip-her-fg' : ''}`}
              >
                {format(d, 'd')}
              </button>
            );
          })}
            </div>
          ))}
        </div>
      </section>

      <Section label={S.cycleHistory.text}>
        <ListCard>
          {runs.map((r, i) => (
            <ListRow
              key={r.start}
              label={r.length === 1 ? t(S.cyclePeriodRunOne, { start: formatDayMonth(r.start) }) : t(S.cyclePeriodRun, { start: formatDayMonth(r.start), n: r.length })}
              value={i === 0 ? S.cycleCurrent.text : lengths[runs.length - 1 - i] ? t(S.cycleLength, { n: lengths[runs.length - 1 - i]! }) : ''}
            />
          ))}
        </ListCard>
      </Section>

      <SecondaryButton size="lg" onClick={() => setPreg(true)}>
        {S.cyclePregnantAgain.text}
      </SecondaryButton>

      <DaySheet date={day} onClose={() => setDay(null)} />
      <PregnantAgainSheet open={preg} onOpenChange={setPreg} />
    </div>
  );
}

export function DaySheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  const state = useDomain();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const existing = date ? periodLogFor(state, date) : undefined;
  const isPeriod = date ? (state.her.cycle.periodDays ?? []).includes(date) : false;
  const [flow, setFlow] = useState<BleedingLevel>('medium');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  useEffect(() => {
    if (!date) return;
    setFlow(existing?.flow ?? 'medium');
    setSymptoms(existing?.symptoms ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);
  const save = () => {
    if (!date) return;
    apply((s, at) => logPeriodDay(s, date, flow, symptoms, at));
    commitLog('period', 'cycle');
    toast(S.toastPeriodDay.text);
    onClose();
  };
  return (
    <BottomSheet open={Boolean(date)} onOpenChange={(o) => !o && onClose()} title={date ? formatLongDate(date) : ''} onSave={save}>
      <div className="flex flex-col gap-5 pb-2">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-sans text-[13px] font-semibold text-ink">{S.cycleFlow.text}</legend>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {FLOWS.map((f) => (
              <FilterChip key={f} role="radio" aria-checked={flow === f} selected={flow === f} onClick={() => setFlow(f)} className="justify-center">
                {cap(f)}
              </FilterChip>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-sans text-[13px] font-semibold text-ink">{S.cycleSymptoms.text}</legend>
          <div className="flex flex-wrap gap-2">
            {S.cycleSymptomList.text.split('|').map((x) => (
              <FilterChip key={x} selected={symptoms.includes(x)} onClick={() => setSymptoms((xs) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]))}>
                {x}
              </FilterChip>
            ))}
          </div>
        </fieldset>
        {isPeriod && date ? (
          <TextAction className="self-start !px-0 text-terracotta-ink" onClick={() => (apply((s) => removePeriodDay(s, date)), onClose())}>
            {S.cycleRemoveDay.text}
          </TextAction>
        ) : null}
      </div>
    </BottomSheet>
  );
}

/** "I'm pregnant again" (6.2, P2): cycle tracking pauses; children stay. */
function PregnantAgainSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const apply = useWeave((s) => s.apply);
  const navigate = useNavigate();
  const [due, setDue] = useState(toISODate(addDays(clockNow(), 7 * 34)));
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={S.cycleDueDateTitle.text}>
      <div className="flex flex-col gap-5 pb-2">
        <Field label={S.birthDate.text} hint={S.cycleDueDateHint.text}>
          <input type="date" className={fieldCls} value={due} min={toISODate(clockNow())} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <PrimaryButton
          size="lg"
          tone="ink"
          onClick={() => {
            apply((s) => pregnantAgain(s, due));
            onOpenChange(false);
            navigate('/today');
          }}
        >
          {S.cycleDueDateSave.text}
        </PrimaryButton>
      </div>
    </BottomSheet>
  );
}

/** Today, cycle-only state (B26): the cycle card. */
export function CycleCard({ state, now }: { state: DomainState; now: Date }) {
  const navigate = useNavigate();
  if (!state.her.cycle.active) return null;
  const day = currentPeriodDay(state, now);
  const estimate = nextPeriodEstimate(state.her.cycle.periodDays ?? []);
  return (
    <button type="button" onClick={() => navigate('/me/cycle')} className="flex w-full flex-col gap-1 rounded-card bg-surface p-5 text-left">
      <span className="type-micro text-ink-2">{S.cycleCardTitle.text}</span>
      <span className="type-insight text-ink">{day ? t(S.cyclePeriodDay, { n: day }) : estimate ? t(S.cycleEstimate, { date: formatDayMonth(estimate) }) : S.cycleNoPeriod.text}</span>
      {!day && !estimate ? <Copy entry={S.cycleTooEarly} className="type-secondary text-ink-3" /> : null}
    </button>
  );
}
