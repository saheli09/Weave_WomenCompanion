import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { differenceInMinutes, format, isSameDay, subDays } from 'date-fns';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import { VACCINE_REVIEW, VACCINE_SCHEDULE } from '../../content/vaccines';
import { ScreenHeader } from '../../components/Shell';
import { FilterChip } from '../../components/Chip';
import { GhostButton, PrimaryButton, SecondaryButton, TextAction } from '../../components/Button';
import { ChecklistRow, ListCard, ListRow, Section } from '../../components/Cards';
import { ActivityTimeline } from '../../components/Timeline';
import { EmptyState } from '../../components/States';
import { DayBars, TrendLine } from '../../components/Charts';
import { BottomSheet } from '../../components/Sheet';
import { Field, fieldCls, FieldError } from '../../components/Form';
import { Copy } from '../../components/Copy';
import { ReviewTag, useReviewMarkers } from '../../components/ReviewFlag';
import { Chevron } from '../../components/Icon';
import { childAge, formatChildAge, formatDayMonth, formatDuration, formatLongDate, formatTimeCompact, parseDate, toISODate } from '../../domain/dates';
import { deriveStage, primaryChild, usesFormula, type ChildStage } from '../../domain/stage';
import type { Child, DomainState, LogEntry } from '../../domain/types';
import { addCourse, endCourse, logGrowth, markVaccine } from '../../domain/transitions';
import { useDomain, useWeave } from '../../state/store';
import { now as clockNow, useNow } from '../../state/clock';
import { activeCourses, doseSlotsToday, logsToday, sleptToday, subjectLabel, timelineText } from '../../state/selectors';
import { beginLog } from '../../metrics/timeToLog';
import { useFeedFlow } from '../feeds/FeedSheets';
import { useSleepFlow } from '../sleep/SleepSheet';
import { useSolidsFlow } from '../food/Food';
import { useDoseActions } from '../medicines/useDoseActions';
import { DiaperSheet } from '../quicklog/BabyLogs';
import { useToast } from '../../app/Toast';
import { LB } from '../quicklog/useHerLogs';

/**
 * Baby tab (B08) and its modules. Stage-adaptive (section 13): newborns lead
 * with feeds, sleep and diapers; solids stage leads with the food journey;
 * toddlers lead with food and medicines, and milk, diaper and sleep fold under
 * "Show more" (taper, not switch). A child is only compared with her own history.
 */

const childLogs = (state: DomainState, childId: string) => state.logs.filter((l) => l.subject.kind === 'child' && l.subject.childId === childId);
const lastDays = (now: Date, n = 7) => Array.from({ length: n }, (_, i) => subDays(now, n - 1 - i));
const dayDatum = (d: Date, value: number) => ({ label: format(d, 'EEEEEE'), full: formatLongDate(d), value });

/** The child the Baby screens show: ?child=, else the youngest. */
export function useBabyChild(): Child | undefined {
  const state = useDomain();
  const [params] = useSearchParams();
  const id = params.get('child');
  return state.children.find((c) => c.id === id) ?? primaryChild(state);
}

function BackHeader({ title, child }: { title: string; child?: Child }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={() => navigate(-1)} className="hit-44 self-start type-micro text-ink-3">
        ‹ {S.back.text}
      </button>
      <div className="flex flex-col gap-[5px]">
        <h1 className="type-greeting text-ink">{title}</h1>
        {child ? <p className="font-sans text-[13px] font-medium text-ink-2">{child.name}</p> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ B08 */

type ModuleId = 'feeding' | 'sleep' | 'diaper' | 'growth' | 'vaccines' | 'medicines' | 'food';

const ORDER: Record<ChildStage, { primary: ModuleId[]; more: ModuleId[] }> = {
  newborn: { primary: ['feeding', 'sleep', 'diaper', 'growth', 'vaccines', 'medicines'], more: [] },
  infant: { primary: ['feeding', 'sleep', 'diaper', 'growth', 'vaccines', 'medicines'], more: [] },
  solids: { primary: ['food', 'feeding', 'sleep', 'diaper', 'growth', 'vaccines', 'medicines'], more: [] },
  toddler: { primary: ['food', 'medicines', 'growth', 'vaccines'], more: ['feeding', 'diaper', 'sleep'] },
};

export function BabyTab() {
  const state = useDomain();
  const now = useNow();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [more, setMore] = useState(false);
  const child = useBabyChild();
  if (!child)
    return (
      <div className="flex flex-col gap-5">
        <ScreenHeader label={S.navBaby.text} title={S.navBaby.text} />
        <EmptyState line={S.babyNoChild.text} />
        <p className="type-body text-ink-2">{S.babyNoChildBody.text}</p>
      </div>
    );
  const stage = deriveStage(child, now);
  const order = ORDER[stage];
  const q = state.children.length > 1 ? `?child=${child.id}` : '';
  return (
    <div className="flex flex-col gap-5" data-screen="baby" data-stage={stage}>
      <ScreenHeader label={S.navBaby.text} pill={t(S.childAgePill, { name: child.name, age: formatChildAge(child.dob, now) })} title={child.name} />
      {state.children.length > 1 ? (
        <div role="group" aria-label={S.childSwitcherA11y.text} className="flex gap-2">
          {state.children.map((c) => (
            <FilterChip key={c.id} selected={c.id === child.id} onClick={() => setParams({ ...Object.fromEntries(params), child: c.id })}>
              {c.name}
            </FilterChip>
          ))}
        </div>
      ) : null}
      {order.primary.map((m) => (
        <Module key={m} id={m} child={child} state={state} now={now} go={(path) => navigate(path + q)} />
      ))}
      {order.more.length ? (
        <>
          <TextAction className="self-start !px-0" onClick={() => setMore((x) => !x)} aria-expanded={more}>
            {more ? S.showLess.text : S.showMore.text}
          </TextAction>
          {more ? order.more.map((m) => <Module key={m} id={m} child={child} state={state} now={now} go={(path) => navigate(path + q)} />) : null}
        </>
      ) : null}
    </div>
  );
}

const t = fmt;

function ModuleCard({ title, summary, latest, onLog, logLabel, onTrends, extra }: { title: string; summary: string; latest?: { id: string; text: string; time: string }[]; onLog?: () => void; logLabel?: string; onTrends: () => void; extra?: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-card bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="type-insight-sm text-ink">{title}</h2>
          <p className="font-sans text-[13px] text-ink-2">{summary}</p>
        </div>
        {onLog ? (
          <GhostButton onClick={onLog} aria-label={logLabel}>
            {S.logAction.text}
          </GhostButton>
        ) : null}
      </div>
      {latest?.length ? (
        <ul className="flex flex-col [&>li+li]:border-t [&>li+li]:border-line">
          {latest.map((l) => (
            <li key={l.id} className="flex min-h-[36px] items-center justify-between font-sans text-[13px]">
              <span className="text-ink">{l.text}</span>
              <span className="text-ink-2">{l.time}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {extra}
      <button type="button" onClick={onTrends} className="flex min-h-[44px] items-center justify-between border-t border-line pt-1 text-left font-sans text-[13px] font-semibold text-ink-2">
        {S.seeTrends.text}
        <Chevron className="text-ink-4" />
      </button>
    </section>
  );
}

function Module({ id, child, state, now, go }: { id: ModuleId; child: Child; state: DomainState; now: Date; go: (path: string) => void }) {
  const { openFeed } = useFeedFlow();
  const { openSleep } = useSleepFlow();
  const { openSolids } = useSolidsFlow();
  const [diaper, setDiaper] = useState(false);
  const today = logsToday(state, now).filter((l) => l.subject.kind === 'child' && l.subject.childId === child.id);
  const latest = (pred: (l: LogEntry) => boolean) =>
    today
      .filter(pred)
      .slice(0, 2)
      .map((l) => ({ id: l.id, text: timelineText(l, state), time: formatTimeCompact(l.at) }));

  switch (id) {
    case 'feeding': {
      const n = today.filter((l) => l.type === 'feed').length;
      const tins = state.formulaPacks.filter((p) => p.childId === child.id && p.status === 'active').length;
      return (
        <ModuleCard
          title={S.moduleFeeding.text}
          summary={n ? (n === 1 ? S.oneFeedToday.text : t(S.feedsToday, { n })) : S.nothingYetToday.text}
          latest={latest((l) => l.type === 'feed')}
          onLog={() => (beginLog('baby.feeding'), openFeed(child.id))}
          logLabel={t(S.logFeedA11y, { name: child.name })}
          onTrends={() => go('/baby/feeding')}
          extra={
            usesFormula(state, child.id) ? (
              <ListCard className="!px-0">
                <ListRow label={S.formulaStockLink.text} value={tins ? t(S.openTins, { n: tins }) : S.noOpenTins.text} chevron onClick={() => go('/baby/formula')} />
              </ListCard>
            ) : null
          }
        />
      );
    }
    case 'sleep':
      return (
        <ModuleCard
          title={S.moduleSleep.text}
          summary={t(S.sleptTodayLine, { duration: formatDuration(sleptToday(state, now, { kind: 'child', childId: child.id })) })}
          latest={latest((l) => l.type === 'sleep')}
          onLog={() => (beginLog('baby.sleep'), openSleep(child.id))}
          logLabel={t(S.logSleepA11y, { name: child.name })}
          onTrends={() => go('/baby/sleep')}
        />
      );
    case 'diaper': {
      const d = today.filter((l): l is Extract<LogEntry, { type: 'diaper' }> => l.type === 'diaper');
      return (
        <>
          <ModuleCard
            title={S.moduleDiaper.text}
            summary={d.length ? t(S.diapersTodayLine, { wet: d.filter((x) => x.kind !== 'dirty').length, dirty: d.filter((x) => x.kind !== 'wet').length }) : S.nothingYetToday.text}
            latest={latest((l) => l.type === 'diaper')}
            onLog={() => (beginLog('baby.diaper'), setDiaper(true))}
            logLabel={t(S.logDiaperA11y, { name: child.name })}
            onTrends={() => go('/baby/diaper')}
          />
          <DiaperSheet open={diaper} onOpenChange={setDiaper} child={child} />
        </>
      );
    }
    case 'growth': {
      const g = childLogs(state, child.id)
        .filter((l): l is Extract<LogEntry, { type: 'growth' }> => l.type === 'growth' && Boolean(l.weightG))
        .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
      return <ModuleCard title={S.moduleGrowth.text} summary={g ? t(S.growthLatest, { weight: weightLabel(g.weightG!, state), date: formatDayMonth(g.at) }) : S.growthNone.text} onTrends={() => go('/baby/growth')} />;
    }
    case 'vaccines': {
      const weeks = childAge(child.dob, now).totalDays / 7;
      const due = VACCINE_SCHEDULE.doses.filter((v) => v.dueWeeks <= weeks);
      const done = new Set((state.vaccinations ?? []).filter((v) => v.childId === child.id).map((v) => v.vaccineId));
      const next = VACCINE_SCHEDULE.doses.find((v) => !done.has(v.id));
      return (
        <ModuleCard
          title={S.moduleVaccines.text}
          summary={t(S.vaccinesLine, { done: due.filter((v) => done.has(v.id)).length, due: due.length })}
          latest={next ? [{ id: next.id, text: t(S.vaccinesNext, { name: next.name, age: next.ageLabel.toLowerCase() }), time: '' }] : undefined}
          onTrends={() => go('/baby/vaccines')}
        />
      );
    }
    case 'medicines': {
      const courses = activeCourses(state, now).filter((m) => m.subject.kind === 'child' && m.subject.childId === child.id && !m.archived);
      return <ModuleCard title={S.moduleMedicines.text} summary={courses.length ? t(S.medicinesActive, { n: courses.length }) : S.medicinesNone.text} latest={courses.map((m) => ({ id: m.id, text: m.name, time: m.doseText }))} onTrends={() => go('/baby/medicines')} />;
    }
    case 'food': {
      const n = state.foodIntros.filter((f) => f.childId === child.id).length;
      return (
        <ModuleCard
          title={S.moduleFood.text}
          summary={t(S.foodLine, { n })}
          latest={latest((l) => l.type === 'feed' && l.mode === 'solids')}
          onLog={() => (beginLog('baby.food'), openSolids(child.id))}
          logLabel={S.foodLogMeal.text}
          onTrends={() => go('/baby/food')}
        />
      );
    }
  }
}

const weightLabel = (g: number, state: DomainState) => (state.her.units.weight === 'lb' ? `${((g / 1000) * LB).toFixed(1)} lb` : `${(g / 1000).toFixed(2)} kg`);

/* ------------------------------------------------- B09, B10, B11: history */

export function ModuleHistory({ kind }: { kind: 'feeding' | 'sleep' | 'diaper' }) {
  const state = useDomain();
  const now = useNow();
  const child = useBabyChild();
  if (!child) return <Navigate to="/baby" replace />;
  const logs = childLogs(state, child.id).filter((l) => parseDate(l.at) <= now);
  const days = lastDays(now);
  const match = (l: LogEntry) => (kind === 'feeding' ? l.type === 'feed' : kind === 'sleep' ? l.type === 'sleep' && Boolean(l.end) : l.type === 'diaper');
  const ofDay = (d: Date) => logs.filter((l) => match(l) && isSameDay(parseDate(l.at), d));
  const data = days.map((d) =>
    dayDatum(
      d,
      kind === 'sleep'
        ? Math.round((ofDay(d).reduce((m, l) => m + (l.type === 'sleep' && l.end ? differenceInMinutes(parseDate(l.end), parseDate(l.start)) : 0), 0) / 60) * 10) / 10
        : ofDay(d).length,
    ),
  );
  const title = kind === 'feeding' ? S.moduleFeeding.text : kind === 'sleep' ? S.moduleSleep.text : S.moduleDiaper.text;
  const caption = kind === 'feeding' ? S.feedsPerDay.text : kind === 'sleep' ? S.sleepPerDay.text : S.diapersPerDay.text;
  const unit = (v: number) => (kind === 'sleep' ? `${v}h` : String(v));
  const recent = [...days]
    .reverse()
    .map((d) => ({ d, items: ofDay(d).sort((a, b) => (a.at < b.at ? 1 : -1)) }))
    .filter((g) => g.items.length);
  return (
    <div className="flex flex-col gap-6" data-screen={`baby-${kind}`}>
      <BackHeader title={title} child={child} />
      <Section label={S.last7days.text}>
        <div className="rounded-card bg-surface p-5">
          <DayBars data={data} unit={unit} caption={caption} />
        </div>
      </Section>
      {recent.length ? (
        recent.map((g) => (
          <Section key={g.d.toDateString()} label={isSameDay(g.d, now) ? S.timelineToday.text : formatLongDate(g.d)}>
            <ActivityTimeline items={g.items.map((l) => ({ id: l.id, subject: subjectLabel(l.subject, state), text: timelineText(l, state), time: formatTimeCompact(l.at) }))} />
          </Section>
        ))
      ) : (
        <EmptyState line={S.timelineEmpty.text} />
      )}
    </div>
  );
}

/* --------------------------------------------------------------- B15 */

export function GrowthScreen() {
  const state = useDomain();
  const now = useNow();
  const child = useBabyChild();
  const [open, setOpen] = useState(false);
  if (!child) return <Navigate to="/baby" replace />;
  const growth = childLogs(state, child.id)
    .filter((l): l is Extract<LogEntry, { type: 'growth' }> => l.type === 'growth')
    .sort((a, b) => (a.at < b.at ? -1 : 1));
  const weights = growth.filter((g) => g.weightG).map((g) => ({ t: parseDate(g.at).getTime(), full: formatDayMonth(g.at), value: g.weightG! / 1000 }));
  return (
    <div className="flex flex-col gap-6" data-screen="baby-growth">
      <BackHeader title={S.growthTitle.text} child={child} />
      <PrimaryButton size="lg" tone="ink" onClick={() => setOpen(true)}>
        {S.growthLog.text}
      </PrimaryButton>
      {weights.length >= 2 ? (
        <section className="flex flex-col gap-3 rounded-card bg-surface p-5">
          <p className="type-body text-ink-2">{t(S.growthOwnLine, { name: child.name })}</p>
          <TrendLine points={weights} unit={(v) => (state.her.units.weight === 'lb' ? `${(v * LB).toFixed(1)} lb` : `${v.toFixed(2)} kg`)} caption={t(S.growthChartCaption, { name: child.name })} />
          <Copy as="p" entry={S.growthBandNote} className="font-sans text-[12px] text-ink-2" />
        </section>
      ) : null}
      {growth.length ? (
        <Section label={S.historyLabel.text}>
          <ListCard>
            {[...growth].reverse().map((g) => (
              <ListRow
                key={g.id}
                label={formatLongDate(g.at)}
                value={[g.weightG ? weightLabel(g.weightG, state) : null, g.lengthCm ? `${g.lengthCm} cm` : null, g.headCm ? `head ${g.headCm} cm` : null].filter(Boolean).join(' · ')}
              />
            ))}
          </ListCard>
        </Section>
      ) : (
        <EmptyState line={S.growthNone.text} />
      )}
      <GrowthSheet child={child} open={open} onOpenChange={setOpen} now={now} />
    </div>
  );
}

function GrowthSheet({ child, open, onOpenChange, now }: { child: Child; open: boolean; onOpenChange: (o: boolean) => void; now: Date }) {
  const state = useDomain();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const unit = state.her.units.weight;
  const [w, setW] = useState('');
  const [l, setL] = useState('');
  const [h, setH] = useState('');
  const [date, setDate] = useState(toISODate(now));
  const [error, setError] = useState(false);
  useEffect(() => {
    if (open) {
      setW('');
      setL('');
      setH('');
      setDate(toISODate(clockNow()));
      setError(false);
    }
  }, [open]);
  const num = (s: string) => (s.trim() ? Number(s.replace(',', '.')) : undefined);
  const save = () => {
    const wv = num(w);
    try {
      apply((s) => logGrowth(s, child.id, { weightG: wv !== undefined ? Math.round((unit === 'lb' ? wv / LB : wv) * 1000) : undefined, lengthCm: num(l), headCm: num(h) }, new Date(`${date}T12:00:00`)).state);
      toast(S.toastGrowth.text);
      onOpenChange(false);
    } catch {
      setError(true);
    }
  };
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={S.growthSheetTitle.text} subtitle={child.name} onSave={save}>
      <div className="flex flex-col gap-4 pb-2">
        <Field label={t(S.growthWeight, { unit })}>
          <input inputMode="decimal" className={fieldCls} value={w} onChange={(e) => setW(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={S.growthLength.text}>
            <input inputMode="decimal" className={fieldCls} value={l} onChange={(e) => setL(e.target.value)} />
          </Field>
          <Field label={S.growthHead.text}>
            <input inputMode="decimal" className={fieldCls} value={h} onChange={(e) => setH(e.target.value)} />
          </Field>
        </div>
        <Field label={S.growthDate.text}>
          <input type="date" className={fieldCls} value={date} max={toISODate(now)} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <FieldError>{error ? S.growthError.text : undefined}</FieldError>
      </div>
    </BottomSheet>
  );
}

/* --------------------------------------------------------------- B16 */

export function VaccinesScreen() {
  const state = useDomain();
  const now = useNow();
  const apply = useWeave((s) => s.apply);
  const markers = useReviewMarkers();
  const child = useBabyChild();
  const [editing, setEditing] = useState<string | null>(null);
  const [date, setDate] = useState('');
  if (!child) return <Navigate to="/baby" replace />;
  const done = new Map((state.vaccinations ?? []).filter((v) => v.childId === child.id).map((v) => [v.vaccineId, v.doneOn]));
  const groups = [...new Set(VACCINE_SCHEDULE.doses.map((d) => d.ageLabel))];
  const dose = VACCINE_SCHEDULE.doses.find((d) => d.id === editing);
  return (
    <div className="flex flex-col gap-6" data-screen="baby-vaccines">
      <BackHeader title={S.vaccinesTitle.text} child={child} />
      {markers ? (
        <span>
          <ReviewTag review={VACCINE_REVIEW} />
        </span>
      ) : null}
      {groups.map((age) => (
        <Section key={age} label={age}>
          <ListCard>
            {VACCINE_SCHEDULE.doses
              .filter((d) => d.ageLabel === age)
              .map((d) => {
                const on = done.get(d.id);
                return (
                  <ChecklistRow
                    key={d.id}
                    checked={Boolean(on)}
                    label={d.name}
                    value={on ? t(S.vaccineDone, { date: formatDayMonth(on) }) : S.vaccineNotYet.text}
                    onToggle={() => {
                      setEditing(d.id);
                      setDate(on ?? toISODate(now));
                    }}
                    a11yLabel={t(S.vaccineRowA11y, { name: d.name, state: on ? t(S.vaccineDone, { date: formatDayMonth(on) }) : S.vaccineNotYet.text })}
                  />
                );
              })}
          </ListCard>
        </Section>
      ))}
      <BottomSheet open={Boolean(dose)} onOpenChange={(o) => !o && setEditing(null)} title={dose?.name ?? ''} subtitle={dose ? t(S.vaccineDue, { age: dose.ageLabel.toLowerCase() }) : undefined}>
        {dose ? (
          <div className="flex flex-col gap-4 pb-2">
            <Field label={S.vaccineDateLabel.text}>
              <input type="date" className={fieldCls} value={date} max={toISODate(now)} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <PrimaryButton size="lg" tone="ink" onClick={() => (apply((s) => markVaccine(s, child.id, dose.id, date)), setEditing(null))}>
              {S.vaccineMarkDone.text}
            </PrimaryButton>
            {done.has(dose.id) ? <TextAction onClick={() => (apply((s) => markVaccine(s, child.id, dose.id, null)), setEditing(null))}>{S.vaccineMarkNotYet.text}</TextAction> : null}
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}

/* --------------------------------------------------------------- B17 */

export function CoursesScreen() {
  const state = useDomain();
  const now = useNow();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const { take, untake } = useDoseActions();
  const child = useBabyChild();
  const [open, setOpen] = useState(false);
  if (!child) return <Navigate to="/baby" replace />;
  const mine = state.medicines.filter((m) => m.subject.kind === 'child' && m.subject.childId === child.id);
  const active = activeCourses(state, now).filter((m) => mine.includes(m) && !m.archived).concat(mine.filter((m) => !m.course && !m.archived));
  const history = mine.filter((m) => !active.includes(m));
  const slots = doseSlotsToday(state, now, { kind: 'child', childId: child.id });
  return (
    <div className="flex flex-col gap-6" data-screen="baby-medicines">
      <BackHeader title={S.coursesTitle.text} child={child} />
      {active.length ? (
        active.map((m) => {
          const day = m.course ? Math.floor((now.getTime() - new Date(m.course.startedAt).getTime()) / 864e5) + 1 : undefined;
          return (
            <section key={m.id} aria-label={m.name} className="flex flex-col gap-3 rounded-card bg-surface p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="type-insight-sm text-ink">{m.name}</h2>
                <span className="font-sans text-[12px] text-ink-2">{m.course ? t(S.courseDay, { dose: m.doseText, day: day!, days: m.course.days }) : `${m.doseText} · ${S.courseOngoing.text}`}</span>
              </div>
              <ListCard className="!px-0">
                {slots
                  .filter((s) => s.medicine.id === m.id)
                  .map((s) => (
                    <ChecklistRow
                      key={s.slot}
                      checked={Boolean(s.takenAt)}
                      label={s.label}
                      value={s.takenAt ? formatTimeCompact(s.takenAt) : S.doseNotTaken.text}
                      onToggle={() => (s.takenAt ? untake(m.id, s.slot) : (beginLog('baby.medicines'), take(m.id, s.slot, 'baby.medicines')))}
                      a11yLabel={t(S.doseTickA11y, { name: m.name, dose: s.label, state: s.takenAt ? 'Taken' : 'Not taken yet' })}
                    />
                  ))}
              </ListCard>
              <TextAction className="self-start !px-0" onClick={() => (apply((s, at) => endCourse(s, m.id, at)), toast(t(S.toastCourseEnded, { name: m.name })))}>
                {S.courseEnd.text}
              </TextAction>
            </section>
          );
        })
      ) : (
        <EmptyState line={S.medicinesNone.text} />
      )}
      <SecondaryButton size="lg" onClick={() => setOpen(true)}>
        {S.courseAdd.text}
      </SecondaryButton>
      <Section label={S.historyLabel.text}>
        {history.length ? (
          <ListCard>
            {history.map((m) => {
              const end = m.course ? new Date(new Date(m.course.startedAt).getTime() + m.course.days * 864e5) : undefined;
              return <ListRow key={m.id} label={m.name} sublabel={m.doseText} value={end ? t(S.courseEnded, { date: formatDayMonth(end) }) : ''} />;
            })}
          </ListCard>
        ) : (
          <p className="font-sans text-[13px] text-ink-2">{S.courseHistoryEmpty.text}</p>
        )}
      </Section>
      <CourseSheet child={child} open={open} onOpenChange={setOpen} />
    </div>
  );
}

const ANCHORS = ['breakfast', 'lunch', 'dinner', 'bedtime'] as const;

function CourseSheet({ child, open, onOpenChange }: { child: Child; open: boolean; onOpenChange: (o: boolean) => void }) {
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [anchors, setAnchors] = useState<(typeof ANCHORS)[number][]>([]);
  const [days, setDays] = useState('');
  const [reminder, setReminder] = useState(false);
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (open) {
      setName('');
      setDose('');
      setAnchors([]);
      setDays('');
      setReminder(false);
      setTried(false);
    }
  }, [open]);
  const d = days.trim() ? Number(days) : undefined;
  const daysBad = d !== undefined && (!Number.isInteger(d) || d < 1 || d > 60);
  const save = () => {
    setTried(true);
    if (!name.trim() || !anchors.length || daysBad) return;
    apply((s, at) => addCourse(s, child.id, { name, doseText: dose, schedule: { anchors }, days: d, reminder }, at).state);
    toast(t(S.toastCourseStarted, { name: name.trim() }));
    onOpenChange(false);
  };
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={t(S.courseSheetTitle, { name: child.name })} onSave={save} dirty={Boolean(name)}>
      <div className="flex flex-col gap-5 pb-2">
        <Field label={S.medName.text} error={tried && !name.trim() ? S.medNameError.text : undefined}>
          <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={tried && !name.trim()} />
        </Field>
        <Field label={S.medDose.text} hint={S.medNoSuggest.text}>
          <input className={fieldCls} value={dose} onChange={(e) => setDose(e.target.value)} placeholder={S.medDosePlaceholder.text} />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-sans text-[13px] font-semibold text-ink">{S.medWhen.text}</legend>
          <div className="flex flex-wrap gap-2">
            {ANCHORS.map((a) => (
              <FilterChip key={a} selected={anchors.includes(a)} onClick={() => setAnchors((xs) => (xs.includes(a) ? xs.filter((x) => x !== a) : [...xs, a]))}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </FilterChip>
            ))}
          </div>
          <FieldError>{tried && !anchors.length ? S.medTimeError.text : undefined}</FieldError>
        </fieldset>
        <Field label={S.courseDays.text} hint={S.courseDaysHint.text} error={daysBad ? S.courseDaysError.text : undefined}>
          <input inputMode="numeric" className={fieldCls} value={days} onChange={(e) => setDays(e.target.value)} />
        </Field>
        <label className="flex min-h-[44px] items-center justify-between gap-3">
          <span className="flex flex-col">
            <span className="type-row text-ink">{S.courseReminder.text}</span>
            <span className="font-sans text-[12px] text-ink-2">{S.courseReminderHint.text}</span>
          </span>
          <input type="checkbox" className="size-6 accent-[var(--color-ink)]" checked={reminder} onChange={(e) => setReminder(e.target.checked)} />
        </label>
      </div>
    </BottomSheet>
  );
}
