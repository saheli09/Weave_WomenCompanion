import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { WeaveMark } from '../onboarding/Threads';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ScreenHeader } from '../../components/Shell';
import { addDays, addMonths, endOfMonth, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { S } from '../../content/strings';
import { Copy, t } from '../../components/Copy';
import { ListCard, ListRow, Section } from '../../components/Cards';
import { PrimaryButton, TextAction } from '../../components/Button';
import { BottomSheet } from '../../components/Sheet';
import { FilterChip } from '../../components/Chip';
import { Field, fieldCls } from '../../components/Form';
import { Chevron } from '../../components/Icon';
import { ReviewFlag } from '../../components/ReviewFlag';
import type { CopyEntry } from '../../content/copy';
import { addDaysISO, calendarDaysBetween, formatDayMonth, formatLongDate, numberWord, PREGNANCY_DAYS, pregnancyWeek, toISODate } from '../../domain/dates';
import { currentPeriodDay } from '../../domain/stage';
import { cycleDay, cycleDayNumber, cyclePhases, type CycleEstimate, type CycleTimeline, type PhaseKey, cycleLengths, cycleTimeline, cycleStartUnknown, endPeriod, logPeriodDay, nextPeriod, nextPeriodEstimate, setDaySymptoms, setUsualCycleLength, startCycleFrom, TYPICAL_CYCLE_DAYS, USUAL_LENGTH_MAX, USUAL_LENGTH_MIN, periodRuns, periodStarts, PREDICT_MONTHS, removePeriodDay } from '../../domain/cycle';
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
  const timeline = cycleTimeline(days, now);
  const phases = cyclePhases(timeline, now);
  const estimate = nextPeriodEstimate(days);
  const today = toISODate(now);
  const runs = periodRuns(days).reverse();
  const lengths = cycleLengths(days);
  const dayN = cycleDayNumber(days, now);
  // The fertile window still ahead of her (or under way): this cycle's, else the next one.
  const window = timeline?.cycles.find((c) => c.kind !== 'past' && c.fertileEnd >= today);

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

      <PeriodSummary state={state} now={now} onLog={() => setDay(today)} />

      {timeline && estimate ? (
        <div className="flex flex-col gap-2">
          <KeyDates dayN={phases?.day ?? dayN} length={phases?.length ?? timeline.averageLength} window={window} next={estimate} />
          <Copy as="p" entry={hasBaby(state) ? S.cycleEstimateFraming : S.cycleEstimateFramingNoBaby} className="font-sans text-[12px] text-ink-2" />
        </div>
      ) : null}

      {timeline ? (
        <CycleAnalysis timeline={timeline} completed={lengths.length} />
      ) : runs.length ? (
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
      ) : null}

      <AboutOvulation baby={hasBaby(state)} />

      <PregnantCta firstTime={!state.history.length && !state.children.length} onClick={() => setPreg(true)} />

      <DaySheet date={day} onClose={() => setDay(null)} />
      <PregnantAgainSheet open={preg} onOpenChange={setPreg} />
    </div>
  );
}

/** Each phase's words and colours: the ring segment, the pill, and the card's tint while she is in it. */
const PHASE: Record<PhaseKey, { name: CopyEntry; line: CopyEntry; stroke: string; opacity: number; pill: string; tint: string }> = {
  period: { name: S.phasePeriod, line: S.phasePeriodLine, stroke: 'var(--color-chip-her-fg)', opacity: 0.75, pill: 'bg-chip-her-bg text-chip-her-fg', tint: 'from-chip-her-bg/80' },
  follicular: { name: S.phaseFollicular, line: S.phaseFollicularLine, stroke: 'var(--color-ink-faint)', opacity: 0.5, pill: 'bg-line text-ink-2', tint: 'from-line/60' },
  fertile: { name: S.phaseFertile, line: S.phaseFertileLine, stroke: 'var(--color-olive-500)', opacity: 0.45, pill: 'bg-olive-500/20 text-ink', tint: 'from-olive-500/15' },
  ovulation: { name: S.phaseOvulation, line: S.phaseOvulationLine, stroke: 'var(--color-olive-500)', opacity: 1, pill: 'bg-olive-500/30 text-ink', tint: 'from-olive-500/25' },
  luteal: { name: S.phaseLuteal, line: S.phaseLutealLine, stroke: 'var(--color-ink-faint)', opacity: 0.3, pill: 'bg-line text-ink-2', tint: 'from-line/60' },
};

/** Plain-words reading about ovulation (decision 2026-10-28): one row that opens, then each answer on tap. */
function AboutOvulation({ baby }: { baby: boolean }) {
  const qa: [CopyEntry, CopyEntry][] = [
    [S.aboutOvulationQ1, S.aboutOvulationA1],
    [S.aboutOvulationQ2, S.aboutOvulationA2],
    [S.aboutOvulationQ3, S.aboutOvulationA3],
    [S.aboutOvulationQ4, baby ? S.aboutOvulationA4 : S.aboutOvulationA4NoBaby],
    [S.aboutOvulationQ5, S.aboutOvulationA5],
  ];
  return (
    <ReviewFlag review={S.aboutOvulationA1.review} className="rounded-card">
      <details data-testid="about-ovulation" className="group/about rounded-card bg-surface px-5">
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 py-3 font-sans text-[15px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
          {S.aboutOvulation.text}
          <Chevron className="shrink-0 rotate-90 text-ink-4 transition-transform group-open/about:-rotate-90" />
        </summary>
        <div className="flex flex-col border-t border-line [&>details+details]:border-t [&>details+details]:border-line">
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
      </details>
    </ReviewFlag>
  );
}

/** "In 15 days", "Tomorrow", "Around today", or how far past the estimate. */
function nextIn(estimate: string, today: string): string {
  const n = calendarDaysBetween(today, estimate);
  if (n > 1) return t(S.cycleNextIn, { n });
  if (n === 1) return S.cycleNextTomorrow.text;
  if (n === 0) return S.cycleNextToday.text;
  return t(S.cycleNextPast, { n: -n });
}

/** Cycle day, fertile window, ovulation and next period, side by side and scrolling sideways on a narrow phone. */
function KeyDates({ dayN, length, window, next }: { dayN?: number; length: number; window?: CycleEstimate; next: string }) {
  const card = 'flex h-[124px] w-[132px] shrink-0 snap-start flex-col justify-between rounded-card p-4';
  const estimate = <span className="font-sans text-[11px] text-ink-2">{S.cycleCardEstimate.text}</span>;
  return (
    <ul tabIndex={0} aria-label={S.cycleKeyDates.text} data-testid="cycle-key-dates" className="-mx-5 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
      {dayN ? (
        <li className={`${card} bg-surface`}>
          <span className="font-sans text-[12px] font-semibold text-ink-2">{S.cycleCardDay.text}</span>
          <span className="flex items-end justify-between">
            <span className="flex flex-col">
              <span className="font-serif text-[32px] leading-none text-ink">{dayN}</span>
              <span className="font-sans text-[11px] text-ink-2">{t(S.cycleCardOf, { n: length })}</span>
            </span>
            <DayRing day={dayN} length={length} />
          </span>
        </li>
      ) : null}
      {window ? (
        <li className={`${card} bg-olive-500/15`}>
          <span className="font-sans text-[12px] font-semibold text-ink-2">{S.cycleCardFertile.text}</span>
          <span className="flex flex-col">
            <span className="font-serif text-[18px] leading-tight text-ink">{t(S.phaseRange, dayRange(window.fertileStart, window.fertileEnd))}</span>
            {estimate}
          </span>
        </li>
      ) : null}
      {window ? (
        <li className={`${card} bg-olive-500/30`}>
          <span className="font-sans text-[12px] font-semibold text-ink-2">{S.cycleCardOvulation.text}</span>
          <span className="flex flex-col">
            <span className="font-serif text-[18px] leading-tight text-ink">{formatDayMonth(window.ovulation)}</span>
            {estimate}
          </span>
        </li>
      ) : null}
      <li className={`${card} bg-chip-her-bg`}>
        <span className="font-sans text-[12px] font-semibold text-chip-her-fg">{S.cycleCardNext.text}</span>
        <span className="flex flex-col">
          <span className="font-serif text-[18px] leading-tight text-ink">{formatDayMonth(next)}</span>
          {estimate}
        </span>
      </li>
    </ul>
  );
}

/** How far through the cycle today is, as a ring. */
function DayRing({ day, length }: { day: number; length: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg aria-hidden width={38} height={38} viewBox="0 0 38 38" className="-rotate-90">
      <circle cx={19} cy={19} r={r} fill="none" stroke="var(--color-line)" strokeWidth={4} />
      <circle cx={19} cy={19} r={r} fill="none" stroke="var(--color-olive-500)" strokeWidth={4} strokeLinecap="round" strokeDasharray={`${Math.min(1, day / length) * c} ${c}`} />
    </svg>
  );
}

/** Averages, then each past cycle as a bar: period, fertile window and ovulation where they fell. Newest first. */
function CycleAnalysis({ timeline, completed }: { timeline: CycleTimeline; completed: number }) {
  const [all, setAll] = useState(false);
  const past = timeline.cycles.filter((c) => c.kind === 'past').reverse();
  const shown = all ? past : past.slice(0, 3);
  const longest = Math.max(...past.map((c) => c.length));
  const tile = (label: string, n: number, tone: string) => (
    <div className={`flex flex-1 flex-col gap-1 rounded-card p-4 ${tone}`}>
      <span className="font-serif text-[24px] leading-none text-ink">{t(S.cycleDaysN, { n })}</span>
      <span className="font-sans text-[12px] text-ink-2">{label}</span>
    </div>
  );
  return (
    <Section label={S.cycleAnalysis.text}>
      <div data-testid="cycle-analysis" className="flex flex-col gap-4 rounded-card bg-surface p-5">
        <div className="flex gap-3">
          {tile(S.cycleAvgPeriod.text, timeline.averagePeriod, 'bg-chip-her-bg')}
          {tile(S.cycleAvgCycle.text, timeline.averageLength, 'bg-olive-500/15')}
        </div>
        <p className="font-sans text-[12px] text-ink-2">{t(S.cycleAnalysisBasis, { n: numberWord(completed), min: timeline.shortest, max: timeline.longest })}</p>
        <ul className="flex flex-col gap-3">
          {shown.map((c) => {
            // The bar is as long as the cycle (against the longest); what is inside it, against its own days.
            const at = (iso: string) => (calendarDaysBetween(c.start, iso) / c.length) * 100;
            const pct = (n: number) => (n / c.length) * 100;
            return (
              <li key={c.start} aria-label={t(S.cyclePastA11y, { start: formatDayMonth(c.start), length: c.length, period: c.periodDays.length, ovulation: formatDayMonth(c.ovulation) })} className="flex flex-col gap-1.5">
                <span aria-hidden className="flex justify-between font-sans text-[12px] text-ink-2">
                  <span>{t(S.cyclePastRow, { start: formatDayMonth(c.start), end: formatDayMonth(c.periodDays.at(-1) ?? c.start) })}</span>
                  <span className="tabular-nums">{t(S.cycleDaysN, { n: c.length })}</span>
                </span>
                <span aria-hidden className="relative h-2.5 rounded-full bg-line/70" style={{ width: `${(c.length / longest) * 100}%` }}>
                  <span className="absolute inset-y-0 left-0 rounded-full bg-chip-her-fg/70" style={{ width: `${pct(c.periodDays.length)}%` }} />
                  <span className="absolute inset-y-0 rounded-full bg-olive-500/45" style={{ left: `${at(c.fertileStart)}%`, width: `${pct(calendarDaysBetween(c.fertileStart, c.fertileEnd) + 1)}%` }} />
                  <span className="absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-olive-500 ring-2 ring-surface" style={{ left: `${at(c.ovulation)}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
        {past.length > 3 ? (
          <TextAction className="self-center" onClick={() => setAll((v) => !v)}>
            {all ? S.cycleShowFewer.text : t(S.cycleShowAll, { n: past.length })}
          </TextAction>
        ) : null}
      </div>
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

/**
 * One day's detail: flow and symptoms. `symptomsOnly` (Today's Symptoms row,
 * decision 2026-10-31) shows just the symptoms, and saving them does not mark
 * the day as a period day.
 */
export function DaySheet({ date, onClose, symptomsOnly = false }: { date: string | null; onClose: () => void; symptomsOnly?: boolean }) {
  const state = useDomain();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const existing = date ? periodLogFor(state, date) : undefined;
  const isPeriod = date ? (state.her.cycle.periodDays ?? []).includes(date) : false;
  const offered = S.cycleSymptomList.text.split('|');
  const [flow, setFlow] = useState<BleedingLevel>('medium');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  useEffect(() => {
    if (!date) return;
    setFlow(existing?.flow ?? 'medium');
    setSymptoms(existing ? (existing.symptoms ?? []) : symptomsOnly ? symptomsOn(state, date).filter((x) => offered.includes(x)) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);
  const save = () => {
    if (!date) return;
    if (symptomsOnly) {
      apply((s, at) => setDaySymptoms(s, date, symptoms, offered, at));
      commitLog('symptom', 'today.her.symptoms');
      toast(S.toastSymptoms.text);
    } else {
      apply((s, at) => logPeriodDay(s, date, flow, symptoms, at));
      commitLog('period', 'cycle');
      toast(S.toastPeriodDay.text);
    }
    onClose();
  };
  return (
    <BottomSheet open={Boolean(date)} onOpenChange={(o) => !o && onClose()} title={symptomsOnly ? S.cycleSymptoms.text : date ? formatLongDate(date) : ''} onSave={save}>
      <div className="flex flex-col gap-5 pb-2">
        {symptomsOnly ? null : <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-sans text-[13px] font-semibold text-ink">{S.cycleFlow.text}</legend>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {FLOWS.map((f) => (
              <FilterChip key={f} role="radio" aria-checked={flow === f} selected={flow === f} onClick={() => setFlow(f)} className="justify-center">
                {cap(f)}
              </FilterChip>
            ))}
          </div>
        </fieldset>}
        <fieldset className="flex flex-col gap-2">
          <legend className={symptomsOnly ? 'sr-only' : 'mb-2 font-sans text-[13px] font-semibold text-ink'}>{S.cycleSymptoms.text}</legend>
          <div className="flex flex-wrap gap-2">
            {offered.map((x) => (
              <FilterChip key={x} selected={symptoms.includes(x)} onClick={() => setSymptoms((xs) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]))}>
                {x}
              </FilterChip>
            ))}
          </div>
        </fieldset>
        {isPeriod && date && !symptomsOnly ? (
          <TextAction className="self-start !px-0 text-terracotta-ink" onClick={() => (apply((s) => removePeriodDay(s, date)), onClose())}>
            {S.cycleRemoveDay.text}
          </TextAction>
        ) : null}
      </div>
    </BottomSheet>
  );
}

/** Names of her symptom logs on a day (period days carry theirs on the period log). */
export function symptomsOn(state: DomainState, date: string): string[] {
  const period = periodLogFor(state, date);
  if (period) return period.symptoms ?? [];
  return state.logs.flatMap((l) => (l.type === 'symptom' && l.subject.kind === 'her' && toISODate(new Date(l.at)) === date ? [l.name] : []));
}

/** "I'm pregnant again" (6.2, P2): cycle tracking pauses; children stay. */
/** A card that reads as a button: "I’m pregnant", or "again" once she has been before. */
function PregnantCta({ firstTime, onClick }: { firstTime: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} data-testid="pregnant-cta" className="flex w-full items-center gap-4 rounded-card border border-chip-her-fg/25 bg-chip-her-bg p-5 text-left shadow-card active:scale-[0.99]">
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-surface">
        <WeaveMark size={30} animate={false} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-serif text-[20px] text-ink">{firstTime ? S.cyclePregnant.text : S.cyclePregnantAgain.text}</span>
        <span className="font-sans text-[13px] text-ink-2">{S.cyclePregnantHint.text}</span>
      </span>
      <Chevron className="shrink-0 text-chip-her-fg" />
    </button>
  );
}

/** A due date she can trust: within the next 42 weeks and not already past. */
const dueInRange = (due: string, now: Date) => {
  const days = pregnancyWeek(due, now).gestationalDays;
  return days >= 0 && days <= 42 * 7;
};

/**
 * Starting a pregnancy from the cycle: the due date, worked out from her last
 * period when there is one, then a short celebration before Weave switches to
 * pregnancy mode (decision 2026-10-30).
 */
function PregnantAgainSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const state = useDomain();
  const apply = useWeave((s) => s.apply);
  const navigate = useNavigate();
  const now = clockNow();
  const lmp = state.her.cycle.lastPeriodStart;
  const fromPeriod = lmp ? addDaysISO(lmp, PREGNANCY_DAYS) : undefined;
  const initial = fromPeriod && dueInRange(fromPeriod, now) ? fromPeriod : toISODate(addDays(now, 7 * 34));
  const [due, setDue] = useState(initial);
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    if (open) setDue(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  // The switch waits for the celebration; this screen closes once pregnancy mode starts.
  useEffect(() => {
    if (!celebrating) return;
    const id = window.setTimeout(() => {
      apply((s) => pregnantAgain(s, due));
      navigate('/today', { replace: true });
    }, CELEBRATION_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrating]);
  const ok = dueInRange(due, now);
  return (
    <>
      <BottomSheet open={open} onOpenChange={onOpenChange} title={S.cycleDueDateTitle.text}>
        <div className="flex flex-col gap-5 pb-2">
          <Field
            label={S.onbDueDate.text}
            error={ok ? undefined : S.cycleDueRange.text}
            hint={fromPeriod && due === fromPeriod ? t(S.cycleDueFromPeriod, { date: formatDayMonth(lmp!) }) : state.children.length ? S.cycleDueDateHint.text : undefined}
          >
            <input type="date" className={fieldCls} value={due} min={toISODate(now)} onChange={(e) => setDue(e.target.value)} />
          </Field>
          <PrimaryButton
            size="lg"
            tone="sage"
            disabled={!ok}
            onClick={() => {
              onOpenChange(false);
              setCelebrating(true);
            }}
          >
            {S.cycleDueDateSave.text}
          </PrimaryButton>
        </div>
      </BottomSheet>
      {celebrating ? <Celebration name={state.her.name} due={due} now={now} /> : null}
    </>
  );
}

const CELEBRATION_MS = 2600;
const CONFETTI_COLOURS = ['var(--color-coral-b)', 'var(--color-hydration)', 'var(--color-olive-500)', 'var(--color-sage-600)', 'var(--color-chip-her-fg)', 'var(--color-coral-a)'];

/** Over the whole phone: the Weave mark weaves itself, confetti falls, then the words. Calm with reduced motion. */
function Celebration({ name, due, now }: { name: string; due: string; now: Date }) {
  const device = document.getElementById('device');
  if (!device) return null;
  return createPortal(
    <div role="status" aria-live="assertive" data-testid="pregnancy-celebration" className="absolute inset-0 z-[95] flex flex-col items-center justify-center gap-6 overflow-hidden app-bg px-8 text-center">
      {Array.from({ length: 36 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="confetti-piece absolute top-0 rounded-[2px]"
          style={{
            left: `${(i * 37) % 100}%`,
            width: i % 3 ? 8 : 6,
            height: i % 3 ? 12 : 6,
            background: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
            // Scattered starts and speeds, so the pieces fall loose rather than in rows.
            animationDelay: `${(i * 53) % 900}ms`,
            animationDuration: `${1.9 + ((i * 7) % 8) / 10}s`,
            borderRadius: i % 4 === 0 ? '999px' : undefined,
          }}
        />
      ))}
      <span className="relative z-10">
        <WeaveMark size={120} />
      </span>
      <div className="splash-rise relative z-10 flex flex-col gap-2" style={{ animationDelay: '700ms' }}>
        <h2 className="type-greeting text-ink">{t(S.celebrateTitle, { name })}</h2>
        <p className="font-sans text-[15px] text-ink-2">{t(S.celebrateLine, { week: pregnancyWeek(due, now).week, date: formatDayMonth(due) })}</p>
      </div>
      <p className="splash-rise relative z-10 font-sans text-[13px] text-ink-3" style={{ animationDelay: '1200ms' }}>
        {S.celebrateSwitching.text}
      </p>
    </div>,
    device,
  );
}

/** Cycle copy speaks of postpartum and breastfeeding only to a mother; a cycle tracker with no baby never sees it. */
const hasBaby = (state: DomainState) => state.children.length > 0 || state.her.phase === 'postpartum';

/** Today, cycle-only state (B26): the cycle card. */
export function CycleCard({ state, now }: { state: DomainState; now: Date }) {
  const [day, setDay] = useState<string | null>(null);
  // Nothing logged yet: Today shows the setup card instead.
  if (!state.her.cycle.active || !state.her.cycle.periodDays?.length) return null;
  return (
    <>
      <PeriodSummary state={state} now={now} onLog={() => setDay(toISODate(now))} />
      <DaySheet date={day} onClose={() => setDay(null)} />
    </>
  );
}

/**
 * First-run Today for a cycle tracker (decision 2026-10-31): one question in
 * place of the cycle card and the welcome. One tap on a chip saves the start
 * (with Undo) and the card becomes the cycle card. "I don’t remember" keeps the
 * card, saying her cycle starts when she logs her first period. No filled button.
 */
export function CycleSetupCard({ state, now }: { state: DomainState; now: Date }) {
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState('');
  const today = toISODate(now);
  const unknown = Boolean(state.her.cycle.startUnknown);
  const save = (date: string) => {
    const before = state.her.cycle;
    apply((s, at) => startCycleFrom(s, date, at));
    commitLog('period', 'today.cycle.setup');
    toast(S.toastPeriodStart.text, () =>
      apply((s) => {
        const r = removePeriodDay(s, date);
        return { ...r, her: { ...r.her, cycle: before } };
      }),
    );
  };
  const title = unknown ? S.cycleUnknownTitle.text : S.cycleSetupTitle.text;
  return (
    <section data-testid="cycle-setup" aria-labelledby="cycle-setup-title" className="flex flex-col gap-4 rounded-card border border-ink/8 bg-surface p-5 shadow-card">
      <div className="flex flex-col gap-1.5">
        {unknown ? <span className="type-micro text-ink-2">{S.cycleYour.text}</span> : null}
        <h2 id="cycle-setup-title" className="font-serif text-[24px] leading-[1.2] text-ink">
          {title}
        </h2>
        {unknown ? null : <p className="font-sans text-[13px] leading-snug text-ink-2">{S.cycleSetupBody.text}</p>}
      </div>
      <div role="group" aria-label={title} className="flex flex-wrap gap-2">
        <FilterChip selected={false} aria-pressed={undefined} onClick={() => save(today)}>
          {S.cycleSetupToday.text}
        </FilterChip>
        <FilterChip selected={false} aria-pressed={undefined} onClick={() => save(addDaysISO(today, -1))}>
          {S.cycleSetupYesterday.text}
        </FilterChip>
        <FilterChip selected={false} aria-pressed={undefined} aria-haspopup="dialog" onClick={() => (setPicked(''), setPicking(true))}>
          {S.cycleSetupPick.text}
        </FilterChip>
      </div>
      {unknown ? null : (
        <TextAction className="-my-2 self-start !px-0 text-[13px] underline underline-offset-2" onClick={() => apply((s) => cycleStartUnknown(s))}>
          {S.cycleSetupUnknown.text}
        </TextAction>
      )}
      <BottomSheet
        open={picking}
        onOpenChange={setPicking}
        title={S.cycleSetupSheet.text}
        onSave={() => (picked && picked <= today ? (save(picked), setPicking(false)) : undefined)}
        saveDisabled={!picked || picked > today}
        dirty={Boolean(picked)}
      >
        <div className="flex flex-col gap-5 pb-2">
          <Field label={S.cycleSetupDate.text}>
            <input type="date" className={fieldCls} max={today} min={addDaysISO(today, -365)} value={picked} onChange={(e) => setPicked(e.target.value)} />
          </Field>
        </div>
      </BottomSheet>
    </section>
  );
}

/**
 * Where her period stands, one card (decision 2026-10-29): the countdown to the
 * next period, or the day of this one, beside a ring of the whole cycle with
 * today marked; then the phase she is in, in a line. Tinted by that phase.
 * First on a cycle tracker's Today and under the calendar on Cycle. `quiet`
 * leaves out the too-early line.
 */
export function PeriodSummary({ state, now, onLog, quiet = false }: { state: DomainState; now: Date; onLog: () => void; quiet?: boolean }) {
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const [lengthOpen, setLengthOpen] = useState(false);
  const days = state.her.cycle.periodDays ?? [];
  const today = toISODate(now);
  const periodDay = currentPeriodDay(state, now);
  const dayN = cycleDayNumber(days, now);
  const phases = cyclePhases(cycleTimeline(days, now), now);
  const phase = phases ? PHASE[phases.today] : undefined;
  // From her cycles once two are logged; before that, a cycle tracker without a baby gets a rough one from her usual length (decision 2026-10-31).
  const next = nextPeriod(state, now, !hasBaby(state));
  const history = next?.basis === 'history';
  const about = next
    ? next.days > 1
      ? t(S.cycleNextInAbout, { n: next.days, date: formatDayMonth(next.date) })
      : t(next.days === 1 ? S.cycleNextTomorrowAbout : S.cycleNextTodayAbout, { date: formatDayMonth(next.date) })
    : undefined;
  const [label, title, sub] = periodDay
    ? [S.phasePeriod.text, t(S.cyclePeriodDayShort, { n: periodDay }), history ? t(S.cycleNextAfter, { date: formatDayMonth(next!.date) }) : about]
    : history
      ? [S.cycleNextLabel.text, nextIn(next!.date, today), t(S.cycleNextAround, { date: formatDayMonth(next!.date) })]
      : hasBaby(state) || !dayN
        ? [S.cycleCardDay.text, S.cycleNoPeriod.text, dayN ? t(S.cycleDayN, { n: dayN }) : undefined]
        : [undefined, t(S.cycleDayN, { n: dayN }), about];
  const started = () => {
    apply((s, at) => startCycleFrom(s, today, at));
    commitLog('period', 'cycle.started');
    toast(S.toastPeriodStarted.text, () => apply((s) => removePeriodDay(s, today)));
  };
  return (
    <section data-testid="cycle-summary" className={`flex flex-col gap-4 rounded-card bg-linear-to-br ${phase?.tint ?? 'from-surface'} to-surface to-70% bg-surface p-5 shadow-card`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          {label ? <span aria-hidden className="type-micro text-ink-2">{label}</span> : null}
          {/* The label joins the heading for screen readers: "Period, Day 3", "Next period, In 17 days". */}
          <h2 className="font-serif text-[34px] leading-[1.1] text-ink">
            {label ? <span className="sr-only">{label}, </span> : null}
            {title}
          </h2>
          {sub ? <p className="font-sans text-[15px] leading-snug text-ink">{sub}</p> : null}
          {next ? (
            <p data-testid="estimate-basis" className="font-sans text-[13px] leading-snug text-ink-2">
              {history ? (
                t(S.cycleBasedOnLast, { n: next.cycles })
              ) : (
                <>
                  <Copy entry={S.cycleRoughBasis} params={{ n: next.length }} />{' '}
                  <button type="button" onClick={() => setLengthOpen(true)} aria-label={t(S.cycleChangeA11y, { n: next.length })} className="hit-44 font-semibold text-ink underline underline-offset-2">
                    {S.cycleChange.text}
                  </button>
                </>
              )}
            </p>
          ) : null}
        </div>
        {phases ? <PhaseRing phases={phases} showDay={!periodDay} /> : null}
      </div>
      {phases && phase ? (
        <ReviewFlag review={S.phasePeriodLine.review} className="rounded-list">
          <div data-testid="cycle-phases" className="flex flex-col gap-1.5 rounded-list bg-surface/70 p-3">
            <h3 className={`self-start rounded-pill px-2.5 py-1 font-sans text-[12px] font-semibold ${phase.pill}`}>{t(S.cyclePhaseToday, { phase: phase.name.text })}</h3>
            <p className="font-sans text-[13px] leading-snug text-ink-2">{phase.line.text}</p>
          </div>
        </ReviewFlag>
      ) : !next && !quiet ? (
        <Copy as="p" entry={hasBaby(state) ? S.cycleTooEarly : S.cycleEstimatesImprove} className="type-body text-ink-2" />
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        {periodDay ? (
          <>
            <PrimaryButton tone="ink" onClick={onLog}>
              {S.cycleLogToday.text}
            </PrimaryButton>
            <TextAction onClick={() => (apply((s, at) => endPeriod(s, at)), toast(S.toastPeriodEnded.text))}>{S.cycleEndPeriod.text}</TextAction>
          </>
        ) : (
          <PrimaryButton tone="ink" onClick={started}>
            {S.cyclePeriodStarted.text}
          </PrimaryButton>
        )}
      </div>
      <CycleLengthSheet open={lengthOpen} onOpenChange={setLengthOpen} current={state.her.cycle.usualLength ?? TYPICAL_CYCLE_DAYS} />
    </section>
  );
}

/** Her usual cycle length, 21 to 45 days, for the rough estimate before two cycles are logged. */
function CycleLengthSheet({ open, onOpenChange, current }: { open: boolean; onOpenChange: (o: boolean) => void; current: number }) {
  const apply = useWeave((s) => s.apply);
  const [n, setN] = useState(current);
  useEffect(() => {
    if (open) setN(current);
  }, [open, current]);
  const step = 'grid size-12 place-items-center rounded-full border border-line font-sans text-[22px] text-ink disabled:opacity-30';
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={S.cycleLengthSheet.text} onSave={() => (apply((s) => setUsualCycleLength(s, n)), onOpenChange(false))} dirty={n !== current}>
      <div className="flex flex-col gap-4 pb-2">
        <p id="cycle-length-label" className="font-sans text-[13px] font-semibold text-ink">
          {S.cycleLengthLabel.text}
        </p>
        <div role="group" aria-labelledby="cycle-length-label" className="flex items-center justify-between gap-4 rounded-card bg-surface-muted px-4 py-3">
          <button type="button" aria-label={S.cycleLengthShorter.text} disabled={n <= USUAL_LENGTH_MIN} onClick={() => setN((x) => x - 1)} className={step}>
            −
          </button>
          <output data-testid="cycle-length" aria-live="polite" className="font-serif text-[34px] text-ink">
            {t(S.cycleLengthDays, { n })}
          </output>
          <button type="button" aria-label={S.cycleLengthLonger.text} disabled={n >= USUAL_LENGTH_MAX} onClick={() => setN((x) => x + 1)} className={step}>
            +
          </button>
        </div>
        <p className="font-sans text-[13px] text-ink-2">{S.cycleLengthHint.text}</p>
      </div>
    </BottomSheet>
  );
}

/**
 * The whole cycle as a ring, each phase as long as its days, a dot on today.
 * The middle shows the cycle day, or, during a period (already the title), the cycle's length.
 */
function PhaseRing({ phases, showDay }: { phases: NonNullable<ReturnType<typeof cyclePhases>>; showDay: boolean }) {
  const size = 104;
  const r = 42;
  const c = 2 * Math.PI * r;
  const gap = 3;
  let offset = 0;
  const angle = ((phases.day - 0.5) / phases.length) * 2 * Math.PI - Math.PI / 2;
  return (
    <div role="img" aria-label={t(S.cyclePhasesA11y, { day: phases.day, length: phases.length, phase: PHASE[phases.today].name.text })} className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg aria-hidden width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {phases.phases.map((p) => {
            const len = (p.days / phases.length) * c;
            const seg = (
              <circle
                key={p.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={PHASE[p.key].stroke}
                strokeOpacity={PHASE[p.key].opacity}
                strokeWidth={8}
                strokeDasharray={`${Math.max(1, len - gap)} ${c}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return seg;
          })}
        </g>
        <circle cx={size / 2 + r * Math.cos(angle)} cy={size / 2 + r * Math.sin(angle)} r={7} fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth={2.5} />
      </svg>
      <span className="flex flex-col items-center leading-none">
        <span className="font-sans text-[11px] text-ink-2">{showDay ? S.cycleRingDay.text : S.cycleRingOfAbout.text}</span>
        <span className="font-serif text-[28px] text-ink">{showDay ? phases.day : phases.length}</span>
      </span>
    </div>
  );
}
