import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ScreenHeader } from '../../components/Shell';
import { addDays, addMonths, endOfMonth, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { S } from '../../content/strings';
import { Copy, t } from '../../components/Copy';
import { ListCard, ListRow, Section } from '../../components/Cards';
import { PrimaryButton, SecondaryButton, TextAction } from '../../components/Button';
import { BottomSheet } from '../../components/Sheet';
import { FilterChip } from '../../components/Chip';
import { Field, fieldCls } from '../../components/Form';
import { Chevron } from '../../components/Icon';
import { ReviewFlag } from '../../components/ReviewFlag';
import type { CopyEntry } from '../../content/copy';
import { formatDayMonth, formatLongDate, numberWord, toISODate } from '../../domain/dates';
import { currentPeriodDay, stageTab } from '../../domain/stage';
import { cycleDay, cycleDayNumber, cyclePhases, type PhaseKey, cycleLengths, cycleTimeline, endPeriod, logPeriodDay, nextPeriodEstimate, periodRuns, periodStarts, PREDICT_MONTHS, removePeriodDay } from '../../domain/cycle';
import { pregnantAgain } from '../../domain/transitions';
import type { BleedingLevel, DomainState, LogEntry } from '../../domain/types';
import { useDomain, useWeave } from '../../state/store';
import { now as clockNow, useNow } from '../../state/clock';
import { useToast } from '../../app/Toast';
import { commitLog } from '../../metrics/timeToLog';

/**
 * Cycle (B25, 9.8): month calendar with logged periods and, once two cycles are
 * complete, estimated ovulation, fertile windows and predicted periods for past,
 * current and the next three months. A day-detail sheet for flow and symptoms,
 * End period, history, coming up. Estimates are always labelled as such and are
 * never a method of contraception. Breastfeeding shows as context only.
 */

const FLOWS: BleedingLevel[] = ['spotting', 'light', 'medium', 'heavy'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function periodLogFor(state: DomainState, date: string) {
  return state.logs.find((l): l is Extract<LogEntry, { type: 'period' }> => l.type === 'period' && l.event !== 'end' && toISODate(new Date(l.at)) === date);
}

/**
 * The cycle screen. A tab of its own for a cycle tracker (asTab, decision
 * 2026-10-28); under Me otherwise. "?log=today" opens today's sheet (the + Period tile).
 */
export function CycleScreen({ asTab = false }: { asTab?: boolean }) {
  const state = useDomain();
  const now = useNow();
  const navigate = useNavigate();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [month, setMonth] = useState(startOfMonth(now));
  const [day, setDay] = useState<string | null>(null);
  const [preg, setPreg] = useState(false);
  // The + Period tile lands here with ?log=today, also when this screen is already open.
  const logToday = params.get('log') === 'today';
  useEffect(() => {
    if (!logToday) return;
    setDay(toISODate(now));
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logToday]);
  if (!state.her.cycle.active) return <Navigate to={asTab ? '/today' : '/me'} replace />;
  const days = state.her.cycle.periodDays ?? [];
  const periodDay = currentPeriodDay(state, now);
  const timeline = cycleTimeline(days, now);
  const phases = cyclePhases(timeline, now);
  const estimate = nextPeriodEstimate(days);
  const today = toISODate(now);
  const runs = periodRuns(days).reverse();
  const lengths = cycleLengths(days);
  const feeding = [...new Set(state.children.flatMap((c) => c.feeding))].join(', ');
  const dayN = cycleDayNumber(days, now);
  // The fertile window still ahead of her (or under way): this cycle's, else the next one.
  const window = timeline?.cycles.find((c) => c.kind !== 'past' && c.fertileEnd >= today);
  const upcoming = timeline?.cycles.filter((c) => c.kind === 'predicted') ?? [];
  const byStart = new Map(timeline?.cycles.map((c) => [c.start, c]));

  const first = periodStarts(days)[0];
  const minMonth = startOfMonth(first ? new Date(`${first}T00:00:00`) : now);
  const maxMonth = addMonths(startOfMonth(now), timeline ? PREDICT_MONTHS : 0);
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)).filter((d, i) => i < 35 || d <= endOfMonth(month));

  return (
    <div className="flex flex-col gap-6" data-screen="cycle">
      {asTab ? (
        <ScreenHeader label={S.navCycle.text} title={S.cycleTitle.text} />
      ) : (
        <div className="flex flex-col gap-5">
          <button type="button" onClick={() => navigate(-1)} className="hit-44 self-start type-micro text-ink-3">
            ‹ {S.back.text}
          </button>
          <h1 className="type-greeting text-ink">{S.cycleTitle.text}</h1>
        </div>
      )}

      <section className="flex flex-col gap-3 rounded-card bg-surface p-5" data-testid="cycle-summary">
        <div className="flex flex-col gap-1">
          <h2 className="type-insight text-ink">{periodDay ? t(S.cyclePeriodDay, { n: periodDay }) : S.cycleNoPeriod.text}</h2>
          {!periodDay && dayN ? <p className="font-sans text-[13px] text-ink-2">{t(S.cycleDayN, { n: dayN })}</p> : null}
        </div>
        {timeline && estimate ? (
          <>
            <ul className="flex flex-col gap-1.5 font-sans text-[14px] text-ink">
              <li>{t(S.cycleEstimate, { date: formatDayMonth(estimate) })}</li>
              {window ? <li>{t(S.cycleFertileEstimate, dayRange(window.fertileStart, window.fertileEnd))}</li> : null}
              {window ? <li>{t(S.cycleOvulationEstimate, { date: formatDayMonth(window.ovulation) })}</li> : null}
            </ul>
            <p className="font-sans text-[12px] text-ink-2">{t(S.cycleRange, { n: numberWord(lengths.length), min: timeline.shortest, max: timeline.longest })}</p>
            <Copy as="p" entry={hasBaby(state) ? S.cycleEstimateFraming : S.cycleEstimateFramingNoBaby} className="font-sans text-[12px] text-ink-2" />
          </>
        ) : (
          <Copy as="p" entry={hasBaby(state) ? S.cycleTooEarly : S.cycleTooEarlyNoBaby} className="type-body text-ink-2" />
        )}
        {feeding ? <p className="font-sans text-[12px] text-ink-2">{t(S.cycleFeedingContext, { feeding })}</p> : null}
        <div className="flex flex-wrap gap-3 pt-1">
          <PrimaryButton tone="ink" onClick={() => setDay(today)}>
            {S.cycleLogToday.text}
          </PrimaryButton>
          {periodDay ? (
            <TextAction onClick={() => (apply((s, at) => endPeriod(s, at)), toast(S.toastPeriodEnded.text))}>{S.cycleEndPeriod.text}</TextAction>
          ) : null}
        </div>
      </section>

      {phases ? <PhaseStrip phases={phases} /> : null}

      <section aria-label={format(month, 'MMMM yyyy')} className="flex flex-col gap-3 rounded-card bg-surface p-4">
        <div className="flex items-center justify-between">
          <button type="button" aria-label={S.cyclePrevMonth.text} disabled={month <= minMonth} onClick={() => setMonth((m) => addMonths(m, -1))} className="grid size-11 rotate-180 place-items-center text-ink-2 disabled:opacity-30">
            <Chevron />
          </button>
          <h2 className="type-insight-sm text-ink">{format(month, 'MMMM yyyy')}</h2>
          <button type="button" aria-label={S.cycleNextMonth.text} disabled={month >= maxMonth} onClick={() => setMonth((m) => addMonths(m, 1))} className="grid size-11 place-items-center text-ink-2 disabled:opacity-30">
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
                const info = cycleDay(timeline, days, iso);
                const flow = info.period === 'logged' ? periodLogFor(state, iso)?.flow : undefined;
                const isToday = isSameDay(d, now);
                const future = d > now;
                const label = [
                  info.period === 'logged' ? t(S.cycleDayPeriod, { flow: flow ?? 'logged' }) : '',
                  info.period === 'predicted' ? S.cycleDayPredicted.text : '',
                  info.ovulation ? S.cycleDayOvulation.text : info.fertile ? S.cycleDayFertile.text : '',
                  isToday ? S.cycleDayToday.text : '',
                ].join('');
                return (
                  <div role="gridcell" key={iso} className={`grid place-items-center ${!inMonth ? 'opacity-40' : ''}`}>
                    <button
                      type="button"
                      disabled={future}
                      aria-label={t(S.cycleDayA11y, { date: formatLongDate(d), state: label })}
                      onClick={() => setDay(iso)}
                      className={`grid size-11 place-items-center rounded-full font-sans text-[13px] tabular-nums ${cellTone(info, future)} ${isToday ? 'ring-1 ring-ink' : ''}`}
                    >
                      {format(d, 'd')}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {timeline ? <Legend /> : null}
      </section>

      {upcoming.length ? (
        <Section label={S.cycleUpcoming.text}>
          <ListCard>
            {upcoming.map((c) => (
              <ListRow
                key={c.start}
                label={t(S.cycleUpcomingRow, { date: formatDayMonth(c.start) })}
                sublabel={t(S.cycleUpcomingDetail, { ...dayRange(c.fertileStart, c.fertileEnd), date: formatDayMonth(c.ovulation) })}
              />
            ))}
          </ListCard>
        </Section>
      ) : null}

      <Section label={S.cycleHistory.text}>
        <ListCard>
          {runs.map((r, i) => {
            const est = byStart.get(r.start);
            return (
              <ListRow
                key={r.start}
                label={r.length === 1 ? t(S.cyclePeriodRunOne, { start: formatDayMonth(r.start) }) : t(S.cyclePeriodRun, { start: formatDayMonth(r.start), n: r.length })}
                sublabel={est?.kind === 'past' ? t(S.cycleHistoryOvulation, { date: formatDayMonth(est.ovulation) }) : undefined}
                value={i === 0 ? S.cycleCurrent.text : lengths[runs.length - 1 - i] ? t(S.cycleLength, { n: lengths[runs.length - 1 - i]! }) : ''}
              />
            );
          })}
        </ListCard>
      </Section>

      <AboutOvulation baby={hasBaby(state)} />

      <SecondaryButton size="lg" onClick={() => setPreg(true)}>
        {S.cyclePregnantAgain.text}
      </SecondaryButton>

      <DaySheet date={day} onClose={() => setDay(null)} />
      <PregnantAgainSheet open={preg} onOpenChange={setPreg} />
    </div>
  );
}

const PHASE: Record<PhaseKey, { name: CopyEntry; line: CopyEntry; bar: string }> = {
  period: { name: S.phasePeriod, line: S.phasePeriodLine, bar: 'bg-chip-her-fg/70' },
  follicular: { name: S.phaseFollicular, line: S.phaseFollicularLine, bar: 'bg-ink-faint/45' },
  fertile: { name: S.phaseFertile, line: S.phaseFertileLine, bar: 'bg-olive-500/45' },
  ovulation: { name: S.phaseOvulation, line: S.phaseOvulationLine, bar: 'bg-olive-500' },
  luteal: { name: S.phaseLuteal, line: S.phaseLutealLine, bar: 'bg-ink-faint/25' },
};

/**
 * Where she is in this cycle (decision 2026-10-28): one bar, each phase as wide
 * as its days, a marker on today, then the phases with their dates. Colours
 * match the calendar: period in her pink, the fertile window and ovulation in olive.
 */
function PhaseStrip({ phases }: { phases: NonNullable<ReturnType<typeof cyclePhases>> }) {
  const current = PHASE[phases.today];
  // The fertile window runs through ovulation day, as the summary card says; the bar draws ovulation on its own.
  const ovulation = phases.phases.find((p) => p.key === 'ovulation');
  const shownEnd = (p: (typeof phases.phases)[number]) => (p.key === 'fertile' && ovulation ? ovulation.start : p.end);
  const at = ((phases.day - 0.5) / phases.length) * 100;
  return (
    <Section label={S.cyclePhasesLabel.text}>
      <ReviewFlag review={S.phasePeriodLine.review} className="rounded-card">
        <article data-testid="cycle-phases" className="flex flex-col gap-4 rounded-card bg-surface p-5">
          <div className="flex flex-col gap-1">
            <h3 className="type-insight-sm text-ink">{t(S.cyclePhaseToday, { phase: current.name.text, day: phases.day, length: phases.length })}</h3>
            <p className="type-body text-ink-2">{current.line.text}</p>
          </div>
          <div role="img" aria-label={t(S.cyclePhasesA11y, { day: phases.day, length: phases.length, phase: current.name.text })} className="relative pt-3">
            <span aria-hidden className="absolute top-0 size-0 -translate-x-1/2 border-x-[5px] border-t-[7px] border-x-transparent border-t-ink" style={{ left: `${at}%` }} />
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              {phases.phases.map((p) => (
                <span key={p.key} className={PHASE[p.key].bar} style={{ flexGrow: p.days, flexBasis: 0, minWidth: 3 }} />
              ))}
            </div>
          </div>
          <ul className="flex flex-col gap-2">
            {phases.phases.map((p) => (
              <li key={p.key} className={`flex items-center justify-between gap-3 font-sans text-[13px] ${p.key === phases.today ? 'font-semibold text-ink' : 'text-ink-2'}`}>
                <span className="flex items-center gap-2">
                  <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${PHASE[p.key].bar}`} />
                  {PHASE[p.key].name.text}
                </span>
                <span className="tabular-nums">{p.start === shownEnd(p) ? formatDayMonth(p.start) : t(S.phaseRange, dayRange(p.start, shownEnd(p)))}</span>
              </li>
            ))}
          </ul>
        </article>
      </ReviewFlag>
    </Section>
  );
}

/** Plain-words reading about ovulation (decision 2026-10-28). Each answer opens on tap. */
function AboutOvulation({ baby }: { baby: boolean }) {
  const qa: [CopyEntry, CopyEntry][] = [
    [S.aboutOvulationQ1, S.aboutOvulationA1],
    [S.aboutOvulationQ2, S.aboutOvulationA2],
    [S.aboutOvulationQ3, S.aboutOvulationA3],
    [S.aboutOvulationQ4, baby ? S.aboutOvulationA4 : S.aboutOvulationA4NoBaby],
    [S.aboutOvulationQ5, S.aboutOvulationA5],
  ];
  return (
    <Section label={S.aboutOvulation.text}>
      <ReviewFlag review={S.aboutOvulationA1.review} className="rounded-card">
        <div data-testid="about-ovulation" className="flex flex-col rounded-card bg-surface px-5 [&>details+details]:border-t [&>details+details]:border-line">
          {qa.map(([q, a]) => (
            <details key={q.text} className="group">
              <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 py-3 font-sans text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                {q.text}
                <Chevron className="shrink-0 rotate-90 text-ink-4 transition-transform group-open:-rotate-90" />
              </summary>
              <p className="type-body pb-4 text-ink-2">{a.text}</p>
            </details>
          ))}
        </div>
      </ReviewFlag>
    </Section>
  );
}

/** Logged period: filled. Predicted period: dashed outline. Fertile window: light olive. Ovulation: olive ring. */
function cellTone(info: ReturnType<typeof cycleDay>, future: boolean): string {
  if (info.period === 'logged') return 'bg-chip-her-bg font-semibold text-chip-her-fg';
  const text = future ? 'text-ink-2' : 'text-ink';
  if (info.period === 'predicted') return `border border-dashed border-chip-her-fg text-chip-her-fg`;
  if (info.ovulation) return `border-2 border-olive-500 bg-olive-500/25 font-semibold ${text}`;
  if (info.fertile) return `bg-olive-500/25 ${text}`;
  return text;
}

/** "4 to 9 September", or "30 November to 5 December" across months. */
function dayRange(start: string, end: string) {
  return start.slice(0, 7) === end.slice(0, 7) ? { start: String(Number(start.slice(8))), end: formatDayMonth(end) } : { start: formatDayMonth(start), end: formatDayMonth(end) };
}

function Legend() {
  const item = (swatch: string, label: string) => (
    <li className="flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden className={`size-3.5 shrink-0 rounded-full ${swatch}`} />
      {label}
    </li>
  );
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-3 font-sans text-[12px] text-ink-2" data-testid="cycle-legend">
      {item('bg-chip-her-bg', S.cycleLegendPeriod.text)}
      {item('border border-dashed border-chip-her-fg', S.cycleLegendPredicted.text)}
      {item('bg-olive-500/25', S.cycleLegendFertile.text)}
      {item('border-2 border-olive-500 bg-olive-500/25', S.cycleLegendOvulation.text)}
    </ul>
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

/** Cycle copy speaks of postpartum and breastfeeding only to a mother; a cycle tracker with no baby never sees it. */
const hasBaby = (state: DomainState) => state.children.length > 0 || state.her.phase === 'postpartum';

/** Today, cycle-only state (B26): the cycle card. */
export function CycleCard({ state, now }: { state: DomainState; now: Date }) {
  const navigate = useNavigate();
  if (!state.her.cycle.active) return null;
  const day = currentPeriodDay(state, now);
  const estimate = nextPeriodEstimate(state.her.cycle.periodDays ?? []);
  return (
    <button type="button" onClick={() => navigate(stageTab(state, now) === 'cycle' ? '/cycle' : '/me/cycle')} className="flex w-full flex-col gap-1 rounded-card bg-surface p-5 text-left">
      <span className="type-micro text-ink-2">{S.cycleCardTitle.text}</span>
      <span className="type-insight text-ink">{day ? t(S.cyclePeriodDay, { n: day }) : estimate ? t(S.cycleEstimate, { date: formatDayMonth(estimate) }) : S.cycleNoPeriod.text}</span>
      {!day && !estimate ? <Copy entry={hasBaby(state) ? S.cycleTooEarly : S.cycleTooEarlyNoBaby} className="type-secondary text-ink-3" /> : null}
    </button>
  );
}
