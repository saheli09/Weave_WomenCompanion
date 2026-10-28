import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { differenceInMinutes, format, isSameDay, subDays } from 'date-fns';
import { S } from '../../content/strings';
import { Copy, t } from '../../components/Copy';
import { ScreenHeader } from '../../components/Shell';
import { InsightCarousel } from '../../components/Insight';
import { ContextCard, ListCard, ListRow, Section } from '../../components/Cards';
import { MoodChips, ProgressRing, SegmentedProgress } from '../../components/Controls';
import { PrimaryButton, TextAction } from '../../components/Button';
import { DayBars } from '../../components/Charts';
import { BottomSheet } from '../../components/Sheet';
import { FilterChip } from '../../components/Chip';
import { Field, fieldCls } from '../../components/Form';
import { EmptyState, InlineUndo, useUndo } from '../../components/States';
import { Icon, Plus } from '../../components/Icon';
import { formatDayMonth, formatDuration, formatLongDate, formatTimeCompact, formatTimeSince, parseDate, pregnancyWeek, toISODate } from '../../domain/dates';
import { currentPeriodDay, postpartumLabel, STAGE_CONFIG, stageTab } from '../../domain/stage';
import type { DomainState, LogEntry, MoodValue } from '../../domain/types';
import { addLog, confirmPeriodReturn, snoozePeriodCard } from '../../domain/transitions';
import { logPastSleep } from '../../domain/sleep';
import { useDomain, useWeave } from '../../state/store';
import { now as clockNow, useNow } from '../../state/clock';
import { cap, latestToday, waterToday } from '../../state/selectors';
import { atTime, hhmm } from '../../state/time';
import { dailyBleeding, PELVIC_WEEKLY_TARGET, pelvicSetsThisWeek } from '../../insights/rules';
import { useInsights } from '../../insights/useInsights';
import { beginLog, commitLog } from '../../metrics/timeToLog';
import { useHerLogs } from '../quicklog/useHerLogs';
import { BleedingSheet } from '../quicklog/BabyLogs';
import { MedicinesToday } from '../today/Today';
import { useToast } from '../../app/Toast';
import { useProviderSheet } from '../../app/ProviderSheet';

/**
 * Me tab (S03, 9.2): her recovery, cycle, body, mood, medicines, history.
 * Variants for postpartum, pregnancy (P1) and cycle-only. Details B18 to B23.
 * "Me" everywhere (17.1 #4).
 */

const GLASS_ML = 250;
const lastDays = (now: Date, n = 7) => Array.from({ length: n }, (_, i) => subDays(now, n - 1 - i));
const herLogs = (state: DomainState) => state.logs.filter((l) => l.subject.kind === 'her');

function BackHeader({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={() => navigate(-1)} className="hit-44 self-start type-micro text-ink-3">
        ‹ {S.back.text}
      </button>
      <h1 className="type-greeting text-ink">{title}</h1>
    </div>
  );
}

/** "Spotting, 3 days": the latest level and how many consecutive days it has held. */
export function bleedingSummary(state: DomainState, now: Date): string {
  const days = dailyBleeding(state, now, 14);
  const firstIdx = days.findIndex(Boolean);
  if (firstIdx < 0) return S.bodyBleedingNone.text;
  const level = days[firstIdx]!;
  let n = 0;
  for (let i = firstIdx; i < days.length && days[i] === level; i++) n++;
  return n > 1 ? t(S.bodyBleedingRun, { level: cap(level), n }) : t(S.bodyBleedingOne, { level: cap(level) });
}

export function MeScreen() {
  const state = useDomain();
  const now = useNow();
  const navigate = useNavigate();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const { insights, ...handlers } = useInsights();
  const mine = insights.filter((i) => i.scope !== 'child');
  const { logWater, logMood } = useHerLogs();
  const undoLogs = useWeave((s) => s.undo);
  const waterUndo = useUndo();
  const [periodSheet, setPeriodSheet] = useState(false);
  const her = state.her;
  const week = postpartumLabel(state, now);
  const preg = her.phase === 'pregnancy' && her.pregnancy ? pregnancyWeek(her.pregnancy.dueDate, now) : undefined;
  const glasses = waterToday(state, now);
  const mood = latestToday(state, now, 'mood');
  const periodDay = currentPeriodDay(state, now);
  const pain = herLogs(state)
    .filter((l): l is Extract<LogEntry, { type: 'pain' }> => l.type === 'pain' && parseDate(l.at) <= now)
    .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  const showPeriodCard =
    her.phase === 'postpartum' &&
    !her.cycle.active &&
    week !== undefined &&
    week >= STAGE_CONFIG.cycleCardFromPostpartumWeek &&
    !(state.prompts.periodCardSnoozedUntil && new Date(state.prompts.periodCardSnoozedUntil) > now);

  // Me is how she is today; the week and the cycle each have their own tab (decision 2026-10-28).
  const journey = stageTab(state, now);
  const title = her.phase === 'postpartum' ? S.meTitlePostpartum.text : S.meTitleNoPhase.text;
  const lastOfType = (type: LogEntry['type']) => herLogs(state).filter((l) => l.type === type && parseDate(l.at) <= now).sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  const symptom = lastOfType('symptom');
  const weight = lastOfType('weight');

  return (
    <div className="flex flex-col gap-5" data-screen="me" data-variant={her.phase}>
      <ScreenHeader label={S.meHeader.text} pill={week ? t(S.weekPill, { n: week }) : preg ? t(S.weekPill, { n: preg.week }) : undefined} title={title} onSettings={() => navigate('/settings')} />
      <InsightCarousel insights={mine} {...handlers} />

      {week ? (
        <section aria-label={t(S.weekPostpartum, { n: week })} className="flex flex-col items-center gap-4 rounded-list border border-ink/8 bg-surface p-[25px] shadow-card">
          <ProgressRing value={Math.min(1, week / 12)} label={t(S.weekPostpartum, { n: week })}>
            <span className="type-insight text-ink">{t(S.weekRing, { n: week })}</span>
          </ProgressRing>
          <div className="flex flex-col items-center gap-2 pt-2">
            <h2 className="type-insight text-ink">{t(S.weekPostpartum, { n: week })}</h2>
            <Copy as="p" entry={S.weekSupportLine} className="text-center font-serif text-[14px] text-ink-2 italic" />
          </div>
        </section>
      ) : null}

      <div className="flex w-full items-stretch gap-3">
        <section aria-label={S.hydration.text} className="flex min-w-0 flex-1 flex-col justify-between gap-4 rounded-card border border-ink/8 bg-surface p-4 shadow-card">
          <button type="button" onClick={() => navigate('/me/hydration')} aria-label={t(S.hydrationTileA11y, { count: glasses, goal: her.hydrationGoalGlasses })} className="flex min-h-[44px] items-center gap-2 text-left">
            <Icon name="hydration" size={14} color="var(--color-ink-2)" />
            <span className="font-sans text-[10px] font-semibold tracking-[0.5px] text-ink-2 uppercase">{S.hydration.text}</span>
          </button>
          <div className="flex items-center justify-between">
            <p className="font-serif text-ink">
              <span className="text-[28px]">{glasses}</span>
              <span className="text-[18px] text-ink-3"> / {her.hydrationGoalGlasses}</span>
            </p>
            <button
              type="button"
              aria-label={S.addGlassA11y.text}
              onClick={() => {
                const id = logWater('me.hydration', { inline: true });
                waterUndo.offer(id, () => undoLogs([id]));
              }}
              className="-mr-3 grid size-11 place-items-center text-ink"
            >
              <Plus size={12} />
            </button>
          </div>
          <SegmentedProgress value={glasses} total={her.hydrationGoalGlasses} label={t(S.glassesOfGoal, { count: glasses, goal: her.hydrationGoalGlasses })} />
          <InlineUndo visible={Boolean(waterUndo.pendingKey)} onUndo={waterUndo.run} />
        </section>
        <section aria-label={S.mood.text} className="flex min-w-0 flex-1 flex-col justify-between gap-3 rounded-card border border-ink/8 bg-surface p-4 shadow-card">
          <button type="button" onClick={() => navigate('/me/mood')} aria-label={t(S.moodTileA11y, { value: mood ? cap(mood.value) : S.add.text })} className="flex min-h-[44px] items-center gap-2 text-left">
            <Icon name="mood" size={14} color="var(--color-ink-2)" />
            <span className="font-sans text-[10px] font-semibold tracking-[0.5px] text-ink-2 uppercase">{S.mood.text}</span>
          </button>
          <p className="font-serif text-[28px] text-ink">{mood ? cap(mood.value) : '--'}</p>
          {/* Inline single select (10.1 "Mood chips (Me)"): one tap logs. 2 x 2 so each chip stays 44px. */}
          <div className="grid grid-cols-2 gap-1">
            {(['low', 'flat', 'ok', 'good'] as MoodValue[]).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={mood?.value === v}
                onClick={() => logMood(v, 'me.mood')}
                className={`min-h-[44px] rounded-chip border font-sans text-[11px] font-medium ${mood?.value === v ? 'border-ink bg-ink text-surface' : 'border-line text-ink'}`}
              >
                {cap(v)}
              </button>
            ))}
          </div>
        </section>
      </div>

      <Section label={S.body.text}>
        <ListCard>
          {her.phase === 'postpartum' ? (
            <>
              <ListRow size="lg" dot={dailyBleeding(state, now, 3).some(Boolean) ? 'coral' : 'grey'} label={S.bleeding.text} value={bleedingSummary(state, now)} chevron onClick={() => navigate('/me/bleeding')} />
              <ListRow size="lg" dot="grey" label={S.pelvicFloor.text} value={t(S.bodyPelvic, { done: pelvicSetsThisWeek(state, now), target: PELVIC_WEEKLY_TARGET })} chevron onClick={() => navigate('/me/pelvic')} />
            </>
          ) : null}
          {her.phase === 'pregnancy' ? (
            <>
              <ListRow size="lg" dot="grey" label={S.meSymptoms.text} value={symptom && symptom.type === 'symptom' ? t(S.lastLogged, { value: symptom.name, ago: formatTimeSince(symptom.at, now).toLowerCase() }) : S.noneLogged.text} />
              <ListRow size="lg" dot="grey" label={S.meWeight.text} value={weight && weight.type === 'weight' ? t(S.lastLogged, { value: `${weight.kg.toFixed(1)} kg`, ago: formatTimeSince(weight.at, now).toLowerCase() }) : S.noneLogged.text} />
            </>
          ) : null}
          <ListRow size="lg" dot="grey" label={S.pain.text} value={pain ? t(S.bodyPain, { location: pain.location, intensity: pain.intensity }) : S.noneLogged.text} chevron onClick={() => navigate('/me/pain')} />
          <ListRow size="lg" dot="grey" label={S.meHerSleep.text} chevron onClick={() => navigate('/me/sleep')} />
        </ListCard>
      </Section>

      {journey !== 'cycle' && (her.cycle.active || periodDay) ? (
        <Section label={S.meCycle.text}>
          <ListCard>
            <ListRow size="lg" label={periodDay ? t(S.periodDay, { n: periodDay }) : S.meCycle.text} chevron onClick={() => navigate('/me/cycle')} />
          </ListCard>
        </Section>
      ) : null}

      {showPeriodCard ? (
        <Section label={S.aroundNow.text}>
          <ContextCard
            titleStyle="question"
            title={S.periodCardTitle.text}
            body={<Copy entry={S.periodCardBody} className="type-body text-ink-2" />}
            actions={
              <>
                <PrimaryButton tone="sage" className="w-[175px]" onClick={() => setPeriodSheet(true)}>
                  {S.periodCardYes.text}
                </PrimaryButton>
                <TextAction className="w-[137px]" onClick={() => (apply((s, at) => snoozePeriodCard(s, at)), toast(S.toastPeriodCardSnoozed.text))}>
                  {S.periodCardNo.text}
                </TextAction>
              </>
            }
          />
        </Section>
      ) : null}

      <Section label={S.meRecords.text}>
        <ListCard>
          <ListRow size="lg" label={S.meMedicines.text} value={t(S.scheduledCount, { n: state.medicines.filter((m) => m.subject.kind === 'her' && !m.archived).length })} chevron onClick={() => navigate('/me/medicines')} />
          {state.history.length ? <ListRow size="lg" label={S.meHistory.text} chevron onClick={() => navigate('/me/history')} /> : null}
        </ListCard>
      </Section>

      <PeriodStartSheet open={periodSheet} onOpenChange={setPeriodSheet} onDone={() => navigate('/me/cycle')} />
    </div>
  );
}

/** "Yes, it has" asks one question: the start date (9.8). Period return is only ever set here, by her (6.3). */
function PeriodStartSheet({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const apply = useWeave((s) => s.apply);
  const [date, setDate] = useState(toISODate(clockNow()));
  useEffect(() => {
    if (open) setDate(toISODate(clockNow()));
  }, [open]);
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={S.periodStartTitle.text}>
      <div className="flex flex-col gap-5 pb-2">
        <Field label={S.birthDate.text} hint={S.periodStartHint.text}>
          <input type="date" className={fieldCls} value={date} max={toISODate(clockNow())} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <PrimaryButton
          size="lg"
          tone="sage"
          onClick={() => {
            apply((s, at) => confirmPeriodReturn(s, date, at));
            onOpenChange(false);
            onDone();
          }}
        >
          {S.periodStartSave.text}
        </PrimaryButton>
      </div>
    </BottomSheet>
  );
}

/* ---------------------------------------------------------------- B18 */

export function HydrationScreen() {
  const state = useDomain();
  const now = useNow();
  const { logWater } = useHerLogs();
  const undoLogs = useWeave((s) => s.undo);
  const waterUndo = useUndo();
  const goal = state.her.hydrationGoalGlasses;
  const count = waterToday(state, now);
  const data = lastDays(now).map((d) => ({
    label: format(d, 'EEEEEE'),
    full: formatLongDate(d),
    value: herLogs(state).reduce((n, l) => (l.type === 'water' && isSameDay(parseDate(l.at), d) && parseDate(l.at) <= now ? n + l.glasses : n), 0),
  }));
  return (
    <div className="flex flex-col gap-6" data-screen="me-hydration">
      <BackHeader title={S.hydrationTitle.text} />
      <section className="flex flex-col gap-3 rounded-card bg-surface p-5">
        <h2 className="type-insight text-ink">{t(S.hydrationToday, { count, goal })}</h2>
        <p className="font-sans text-[13px] text-ink-2">{t(S.hydrationMl, { ml: count * GLASS_ML })}</p>
        <SegmentedProgress value={count} total={goal} label={t(S.glassesOfGoal, { count, goal })} />
        <div className="flex items-center gap-3">
          <PrimaryButton
            tone="ink"
            onClick={() => {
              const id = logWater('me.hydration.detail', { inline: true });
              waterUndo.offer(id, () => undoLogs([id]));
            }}
          >
            {S.hydrationAdd.text}
          </PrimaryButton>
          <InlineUndo visible={Boolean(waterUndo.pendingKey)} onUndo={waterUndo.run} />
        </div>
      </section>
      <Section label={S.last7days.text}>
        <div className="rounded-card bg-surface p-5">
          <DayBars data={data} unit={String} caption={S.hydrationPerDay.text} />
        </div>
      </Section>
    </div>
  );
}

/* ---------------------------------------------------------------- B19 */

export function MoodScreen() {
  const state = useDomain();
  const now = useNow();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const openProvider = useProviderSheet();
  const { logMood } = useHerLogs();
  const mood = latestToday(state, now, 'mood');
  const [note, setNote] = useState('');
  const days = [...lastDays(now)].reverse().map((d) => {
    const m = herLogs(state)
      .filter((l) => l.type === 'mood' && isSameDay(parseDate(l.at), d) && parseDate(l.at) <= now)
      .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
    return { d, m };
  });
  return (
    <div className="flex flex-col gap-6" data-screen="me-mood">
      <BackHeader title={S.moodTitle.text} />
      <section className="flex flex-col gap-4 rounded-card bg-surface p-5">
        <p className="type-insight-sm text-ink">{mood ? t(S.moodToday, { value: cap(mood.value) }) : S.moodNotYet.text}</p>
        <MoodChips value={mood?.value} onChange={(v) => (beginLog('me.mood.detail'), logMood(v, 'me.mood.detail'))} />
        {mood ? (
          <div className="flex items-end gap-2">
            <Field label={S.moodNoteLabel.text}>
              <input className={fieldCls} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <TextAction
              disabled={!note.trim()}
              onClick={() => {
                apply((s) => ({ ...s, logs: s.logs.map((l) => (l.id === mood.id ? { ...l, note: note.trim() } : l)) }));
                setNote('');
                toast(S.moodNoteSaved.text);
              }}
            >
              {S.save.text}
            </TextAction>
          </div>
        ) : null}
      </section>
      <Section label={S.moodHistory.text}>
        <ListCard>
          {days.map(({ d, m }) => (
            <ListRow key={d.toDateString()} label={isSameDay(d, now) ? S.timelineToday.text : formatLongDate(d)} value={m && m.type === 'mood' ? `${cap(m.value)}${m.note ? ` · ${m.note}` : ''}` : '--'} />
          ))}
        </ListCard>
      </Section>
      <button type="button" onClick={() => openProvider('support')} className="min-h-[44px] text-left">
        <Copy entry={S.moodSupportLine} className="type-body text-ink-2 underline underline-offset-2" />
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- B20 */

export function BleedingScreen() {
  const state = useDomain();
  const now = useNow();
  const [open, setOpen] = useState(false);
  if (state.her.phase !== 'postpartum') return <Navigate to="/me" replace />;
  const days = dailyBleeding(state, now, 14);
  return (
    <div className="flex flex-col gap-6" data-screen="me-bleeding">
      <BackHeader title={S.bleedingTitle.text} />
      <section className="flex flex-col gap-4 rounded-card bg-surface p-5">
        <h2 className="type-insight text-ink">{bleedingSummary(state, now)}</h2>
        <PrimaryButton tone="ink" onClick={() => (beginLog('me.bleeding'), setOpen(true))}>
          {S.logBleedingA11y.text}
        </PrimaryButton>
      </section>
      <Section label={S.bleedingHistory.text}>
        <ListCard>
          {days.map((level, i) => {
            const d = subDays(now, i);
            return <ListRow key={i} label={i === 0 ? S.timelineToday.text : formatLongDate(d)} value={level ? cap(level) : S.bleedingNoneDay.text} muted={!level} />;
          })}
        </ListCard>
      </Section>
      <BleedingSheet open={open} onOpenChange={setOpen} entry="me.bleeding" />
    </div>
  );
}

/* ---------------------------------------------------------------- B21 */

export function PelvicScreen() {
  const state = useDomain();
  const now = useNow();
  const log = useWeave((s) => s.log);
  const undoLogs = useWeave((s) => s.undo);
  const u = useUndo();
  const done = pelvicSetsThisWeek(state, now);
  const data = lastDays(now).map((d) => ({
    label: format(d, 'EEEEEE'),
    full: formatLongDate(d),
    value: herLogs(state).reduce((n, l) => (l.type === 'pelvic_floor' && isSameDay(parseDate(l.at), d) && parseDate(l.at) <= now ? n + l.sets : n), 0),
  }));
  return (
    <div className="flex flex-col gap-6" data-screen="me-pelvic">
      <BackHeader title={S.pelvicTitle.text} />
      <section className="flex flex-col gap-4 rounded-card bg-surface p-5">
        <h2 className="type-insight text-ink">{t(S.pelvicWeek, { done, target: PELVIC_WEEKLY_TARGET })}</h2>
        <Copy as="p" entry={S.pelvicTargetNote} className="font-sans text-[12px] text-ink-2" />
        <div className="flex items-center gap-3">
          <PrimaryButton
            tone="ink"
            onClick={() => {
              const e = log({ kind: 'her' }, { type: 'pelvic_floor', sets: 1 }, 'quick');
              commitLog('other', 'me.pelvic');
              u.offer(e.id, () => undoLogs([e.id]));
            }}
          >
            {S.pelvicLog.text}
          </PrimaryButton>
          <InlineUndo visible={Boolean(u.pendingKey)} onUndo={u.run} />
        </div>
      </section>
      <Section label={S.last7days.text}>
        <div className="rounded-card bg-surface p-5">
          <DayBars data={data} unit={String} caption={S.pelvicPerDay.text} />
        </div>
      </Section>
    </div>
  );
}

/* ---------------------------------------------------------------- B22 */

export function PainScreen() {
  const state = useDomain();
  const now = useNow();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const openProvider = useProviderSheet();
  const locations = S.painLocations.text.split('|');
  const [where, setWhere] = useState<string | null>(null);
  const [level, setLevel] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const history = herLogs(state)
    .filter((l): l is Extract<LogEntry, { type: 'pain' }> => l.type === 'pain' && parseDate(l.at) <= now)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 14);
  const save = () => {
    if (!where || !level) return;
    apply((s, at) => addLog(s, { kind: 'her' }, { type: 'pain', location: where, intensity: level }, at, 'sheet').state);
    commitLog('other', 'me.pain');
    toast(t(S.toastPain, { location: where, intensity: level }));
    setWhere(null);
    setLevel(null);
  };
  return (
    <div className="flex flex-col gap-6" data-screen="me-pain">
      <BackHeader title={S.painTitle.text} />
      <section className="flex flex-col gap-4 rounded-card bg-surface p-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-sans text-[13px] font-semibold text-ink">{S.painWhere.text}</legend>
          <div role="radiogroup" className="flex flex-wrap gap-2">
            {locations.map((l) => (
              <FilterChip key={l} role="radio" aria-checked={where === l} selected={where === l} onClick={() => setWhere(l)}>
                {l}
              </FilterChip>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-sans text-[13px] font-semibold text-ink">{S.painHowMuch.text}</legend>
          <div role="radiogroup" className="grid grid-cols-5 gap-2">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <FilterChip key={n} role="radio" aria-checked={level === n} selected={level === n} onClick={() => setLevel(n)} className="justify-center !px-0">
                {n}
              </FilterChip>
            ))}
          </div>
        </fieldset>
        <PrimaryButton tone="ink" disabled={!where || !level} onClick={save}>
          {S.painSave.text}
        </PrimaryButton>
        <button type="button" onClick={() => openProvider()} className="min-h-[44px] text-left">
          <Copy entry={S.painOffRamp} className="type-body text-ink-2 underline underline-offset-2" />
        </button>
      </section>
      {history.length ? (
        <Section label={S.historyLabel.text}>
          <ListCard>
            {history.map((p) => (
              <ListRow key={p.id} label={`${formatDayMonth(p.at)}, ${formatTimeCompact(p.at)}`} value={t(S.bodyPain, { location: p.location, intensity: p.intensity })} />
            ))}
          </ListCard>
        </Section>
      ) : (
        <EmptyState line={S.painNone.text} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------- B23 (P2) */

export function HerSleepScreen() {
  const state = useDomain();
  const now = useNow();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const [from, setFrom] = useState('23:00');
  const [to, setTo] = useState(hhmm(new Date(clockNow().setHours(6, 30))));
  const data = lastDays(now).map((d) => ({
    label: format(d, 'EEEEEE'),
    full: formatLongDate(d),
    value:
      Math.round(
        (herLogs(state).reduce((m, l) => (l.type === 'sleep' && l.end && isSameDay(parseDate(l.end), d) ? m + differenceInMinutes(parseDate(l.end), parseDate(l.start)) : m), 0) / 60) * 10,
      ) / 10,
  }));
  const save = () => {
    const end = atTime(to);
    const start = atTime(from);
    if (start > end) start.setDate(start.getDate() - 1);
    try {
      apply((s, at) => logPastSleep(s, { kind: 'her' }, start, end, at).state);
      toast(t(S.toastSleepEnded, { name: S.herChip.text, duration: formatDuration((end.getTime() - start.getTime()) / 60_000) }));
    } catch {
      /* the inputs only allow valid clock times; out-of-range spans are ignored */
    }
  };
  return (
    <div className="flex flex-col gap-6" data-screen="me-sleep">
      <BackHeader title={S.herSleepTitle.text} />
      <section className="flex flex-col gap-3 rounded-card bg-surface p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label={S.sleepFrom.text}>
            <input type="time" className={fieldCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={S.sleepTo.text}>
            <input type="time" className={fieldCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <PrimaryButton tone="ink" onClick={save}>
          {S.herSleepLog.text}
        </PrimaryButton>
      </section>
      <Section label={S.last7days.text}>
        <div className="rounded-card bg-surface p-5">
          <DayBars data={data} unit={(v) => `${v}h`} caption={S.herSleepPerDay.text} />
        </div>
      </Section>
    </div>
  );
}

/* --------------------------------------------------------- her medicines */

export function HerMedicinesScreen() {
  const state = useDomain();
  const now = useNow();
  return (
    <div className="flex flex-col gap-6" data-screen="me-medicines">
      <BackHeader title={S.meMedicinesTitle.text} />
      <MedicinesToday state={state} now={now} />
    </div>
  );
}

