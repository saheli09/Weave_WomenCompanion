import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { S } from '../../content/strings';
import { readingForWeek } from '../../content/reading';
import { milestonesForWeek } from '../../content/milestones';
import { t, Copy } from '../../components/Copy';
import { ScreenHeader } from '../../components/Shell';
import { InsightCarousel } from '../../components/Insight';
import { SubjectCard, KPIRow, Section, ListCard, ListRow, AddRow, ChecklistRow, ReadingCard, ContextCard, Avatar } from '../../components/Cards';
import { ActivityTimeline } from '../../components/Timeline';
import { EmptyState, InlineUndo, useUndo } from '../../components/States';
import { BleedingSheet, DiaperChooser } from '../quicklog/BabyLogs';
import { useHerLogs } from '../quicklog/useHerLogs';
import { useFeedFlow } from '../feeds/FeedSheets';
import { EditLogSheet } from '../timeline/EditLogSheet';
import { HerTiles } from '../me/Me';
import { BirthPlanSheet, bagValue, checklistOf, HospitalBagSheet, planValue } from '../pregnancy/ChecklistSheets';
import { CycleCard, DaySheet } from '../cycle/Cycle';
import { FirstFoodPrompts, MealCard } from '../food/Food';
import { useSleepFlow } from '../sleep/SleepSheet';
import { PrimaryButton, GhostButton } from '../../components/Button';
import { Chevron } from '../../components/Icon';
import { format } from 'date-fns';
import { MoodSheet } from '../quicklog/QuickLogSheet';
import { AppointmentSheet, type AppointmentTarget } from '../pregnancy/AppointmentSheet';
import { startLabour } from '../../domain/transitions';
import { LabourScreen } from '../labour/Labour';
import { useProviderSheet } from '../../app/ProviderSheet';
import { useSharing } from '../settings/Settings';
import { formatChildAge, formatDayMonth, formatDuration, formatLongDate, formatTimeCompact, formatTimeSince, numberWord, capitalise, parseDate, pregnancyWeek, minutesSince, formatTime, toISODate } from '../../domain/dates';
import { currentPeriodDay, deriveTodayState, primaryChild, STAGE_CONFIG, type TodayState } from '../../domain/stage';
import type { Child, DomainState, Medicine } from '../../domain/types';
import { MedicineSheet } from '../medicines/MedicineSheet';
import { useDoseActions } from '../medicines/useDoseActions';
import { beginLog } from '../../metrics/timeToLog';
import {
  activeCourses,
  diapersToday,
  doseSlotsToday,
  feedCaption,
  greeting,
  lastFeed,
  lastMeal,
  latestToday,
  sleptToday,
  timelineItems,
  waterNudge,
  waterToday,
  cap,
} from '../../state/selectors';
import { useDomain, useWeave } from '../../state/store';
import { useNow } from '../../state/clock';
import { useInsights } from '../../insights/useInsights';

/**
 * Today (9.1), all states. Phase 0 builds the composition for each state from
 * seed data. Logging interactions arrive in Phase 1 (the "+" affordances show a
 * dev notice until then); meal suggestions arrive in Phase 3.
 */

export function Today({ onFab }: { onFab: () => void }) {
  const state = useDomain();
  const now = useNow(30_000);
  const todayState = deriveTodayState(state, now);
  const insights = useInsights();
  return (
    <div className="flex w-full flex-1 flex-col gap-5" data-today-state={todayState}>
      <Compose state={state} now={now} todayState={todayState} insights={insights} onFab={onFab} />
    </div>
  );
}

function Compose({ state, now, todayState, insights, onFab }: { state: DomainState; now: Date; todayState: TodayState; insights: ReturnType<typeof useInsights>; onFab: () => void }) {
  const child = primaryChild(state);
  const date = formatLongDate(now);
  const pill = child ? t(S.childAgePill, { name: child.name, age: formatChildAge(child.dob, now) }) : undefined;
  // The one-time welcome sits above the insights in every state, straight under the header.
  const carousel = (
    <>
      <WelcomeCard state={state} todayState={todayState} onFab={onFab} />
      <InsightCarousel {...insights} />
    </>
  );

  switch (todayState) {
    case 'pregnancy':
    case 'pregnancy_late':
    case 'pregnancy_with_child':
      return <PregnancyToday state={state} now={now} date={date} carousel={carousel} withChild={todayState === 'pregnancy_with_child' ? child : undefined} />;
    case 'labour':
      return <LabourScreen />;
    case 'postpartum_baby':
    case 'postpartum_solids':
      return (
        <>
          <ScreenHeader label={date} pill={pill} title={greeting(now, state.her.name)} />
          {carousel}
          <FinishBirthDetails state={state} />
          <CardsRow state={state} now={now} child={child} toddler={false} />
          {todayState === 'postpartum_solids' ? (
            <>
              <MealCard state={state} now={now} child={child!} />
              <FirstFoodPrompts state={state} now={now} child={child!} />
            </>
          ) : null}
          <TodaySoFar state={state} now={now} onFab={onFab} />
        </>
      );
    case 'toddler':
      // Toddler (9.1, 17.1 #5): meals are primary, so the compact meal card comes
      // straight after the insights, then the child and Me cards. Cards that only
      // exist while something is active (a new-food prompt, a medicine course)
      // sit directly under them.
      return (
        <>
          <ScreenHeader label={date} pill={pill} title={greeting(now, state.her.name)} />
          {carousel}
          <MealCard state={state} now={now} child={child!} />
          <FinishBirthDetails state={state} />
          <CardsRow state={state} now={now} child={child} toddler />
          <FirstFoodPrompts state={state} now={now} child={child!} />
          <CourseBlock state={state} now={now} />
          <TodaySoFar state={state} now={now} onFab={onFab} />
        </>
      );
    case 'cycle_only':
    case 'empty':
      return (
        <>
          <ScreenHeader label={date} title={greeting(now, state.her.name)} />
          {/* Her period comes first for a cycle tracker: the countdown, or the day of it. */}
          <CycleCard state={state} now={now} />
          {carousel}
          {/* Water and mood as two tiles side by side; her period already leads the page. */}
          <HerTiles from="today" />
          <TodaySoFar state={state} now={now} onFab={onFab} />
        </>
      );
  }
}

/* ---------------- Postpartum and toddler ---------------- */

/**
 * Child and Me cards side by side. The diaper chooser opens as a full-width
 * strip directly under the cards: inside a half-width card its three choices
 * could not stay 44px wide at 360px (PRD 15).
 */
function CardsRow({ state, now, child, toddler }: { state: DomainState; now: Date; child?: Child; toddler: boolean }) {
  const [diaperOpen, setDiaperOpen] = useState(false);
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-start gap-3">
        {child ? (
          <ChildCard
            state={state}
            now={now}
            child={child}
            toddler={toddler}
            diaperOpen={diaperOpen}
            onDiaper={() => {
              if (diaperOpen) return setDiaperOpen(false);
              beginLog('today.child.diaper');
              setDiaperOpen(true);
            }}
          />
        ) : null}
        <MeCard state={state} now={now} />
      </div>
      {child && diaperOpen ? <DiaperChooser child={child} onDone={() => setDiaperOpen(false)} /> : null}
    </div>
  );
}

function ChildCard({ state, now, child, toddler, diaperOpen, onDiaper }: { state: DomainState; now: Date; child: Child; toddler: boolean; diaperOpen: boolean; onDiaper: () => void }) {
  const { openFeed } = useFeedFlow();
  const { openSleep } = useSleepFlow();
  const last = lastFeed(state, now, child);
  const feeding = state.timers.breastfeed?.childId === child.id ? state.timers.breastfeed.running : undefined;
  // Toddler (17.1 #5, 13): a short line, "Last meal, 2h ago", from the last solids or milk log,
  // instead of a large "since last feed" figure.
  const toddlerLine = !feeding && toddler;
  const value = feeding
    ? S.feedingNowValue.text
    : toddlerLine
      ? last
        ? t(S.lastMealAgo, { ago: formatTimeSince(last.at, now).toLowerCase().replace(' ', '\u00a0') }) // keeps "15m ago" on one line
        : S.noMealYet.text
      : last
        ? formatDuration(minutesSince(last.at, now))
        : '--';
  const caption = feeding
    ? t(S.feedingNowCaption, { side: feeding.side })
    : !last
      ? toddler
        ? null
        : S.noFeedYet.text
      : toddler
        ? capitalise(last.mode === 'solids' ? last.slot : feedCaption(last, state.her.units))
        : `${S.sinceLastFeed.text} · ${feedCaption(last, state.her.units)}`;
  const rows = (
    <>
      <KPIRow
        label={S.diapers.text}
        value={String(diapersToday(state, now, child))}
        onAdd={onDiaper}
        addLabel={t(S.logDiaperA11y, { name: child.name })}
        expanded={diaperOpen}
      />
      <KPIRow
        label={S.slept.text}
        value={state.timers.sleep?.subject.kind === 'child' && state.timers.sleep.subject.childId === child.id ? S.feedingNowValue.text : formatDuration(sleptToday(state, now, { kind: 'child', childId: child.id }))}
        onAdd={() => {
          beginLog('today.child.sleep');
          openSleep(child.id);
        }}
        addLabel={t(S.logSleepA11y, { name: child.name })}
      />
    </>
  );
  return (
    <SubjectCard
      name={child.name}
      avatar={child.photo}
      kpi={{
        value,
        style: toddlerLine ? 'text' : 'numeral',
        caption,
        onAdd: () => {
          beginLog('today.child.feed');
          openFeed(child.id);
        },
        addLabel: t(S.logFeedA11y, { name: child.name }),
      }}
      rows={rows}
    />
  );
}

function MeCard({ state, now }: { state: DomainState; now: Date }) {
  const undoLogs = useWeave((s) => s.undo);
  const { logWater } = useHerLogs();
  const waterUndo = useUndo();
  const [sheet, setSheet] = useState<'bleeding' | 'mood' | null>(null);
  const [periodDayOpen, setPeriodDay] = useState<string | null>(null);
  const open = (which: 'bleeding' | 'mood') => {
    beginLog(`today.her.${which}`);
    setSheet(which);
  };
  const glasses = waterToday(state, now);
  const nudge = waterNudge(state, now);
  const nudgeText = nudge ? (nudge.kind === 'none-yet' ? S.waterNudgeNone.text : t(S.waterNudgeSince, { n: nudge.hours })) : undefined;
  const periodDay = currentPeriodDay(state, now);
  const period = latestToday(state, now, 'period');
  const bleeding = latestToday(state, now, 'bleeding');
  const mood = latestToday(state, now, 'mood');
  const rows = periodDay ? (
    <>
      <KPIRow label={S.period.text} value={t(S.periodDay, { n: periodDay })} onAdd={() => (beginLog('today.her.period'), setPeriodDay(toISODate(now)))} addLabel={S.logPeriodA11y.text} />
      <KPIRow label={S.flow.text} value={period ? cap(period.flow) : S.add.text} muted={!period} />
    </>
  ) : (
    <>
      {state.her.phase === 'postpartum' ? (
        <KPIRow label={S.bleeding.text} value={bleeding ? cap(bleeding.level) : S.add.text} muted={!bleeding} onAdd={() => open('bleeding')} addLabel={S.logBleedingA11y.text} />
      ) : null}
      <KPIRow label={S.mood.text} value={mood ? cap(mood.value) : S.add.text} muted={!mood} onAdd={() => open('mood')} addLabel={S.logMoodA11y.text} />
    </>
  );
  return (
    <>
      <SubjectCard
        name={S.herChip.text}
        avatar="/avatars/her.png"
        // Water overdue: the card rings and the caption says since when (decision 2026-10-30).
        className={nudgeText ? 'water-nudge ring-2 ring-hydration' : ''}
        kpi={{
          value: t(S.glassesOfGoal, { count: glasses, goal: state.her.hydrationGoalGlasses }),
          caption: (
            <>
              {nudgeText ? (
                <span data-testid="water-nudge" className="font-semibold text-sage-600">
                  {nudgeText}
                </span>
              ) : (
                <span>{S.glassesToday.text}</span>
              )}
              <InlineUndo visible={Boolean(waterUndo.pendingKey)} onUndo={waterUndo.run} label={S.undo.text} />
            </>
          ),
          // Instant increment with an inline Undo for about four seconds (10.1, 10.3).
          onAdd: () => {
            const id = logWater('today.her.water', { inline: true });
            waterUndo.offer(id, () => undoLogs([id]));
          },
          addLabel: nudgeText ? `${S.addGlassA11y.text}. ${nudgeText}` : S.addGlassA11y.text,
        }}
        rows={rows}
      />
      <BleedingSheet open={sheet === 'bleeding'} onOpenChange={(o) => !o && setSheet(null)} entry="today.her.bleeding" />
      <MoodSheet open={sheet === 'mood'} onOpenChange={(o) => !o && setSheet(null)} entry="today.her.mood" />
      <DaySheet date={periodDayOpen} onClose={() => setPeriodDay(null)} />
    </>
  );
}

/**
 * First Today after onboarding (9.13): one card that says what to do first for
 * her situation. Taking that first step retires it for good.
 */
function WelcomeCard({ state, todayState, onFab }: { state: DomainState; todayState: TodayState; onFab: () => void }) {
  const navigate = useNavigate();
  const apply = useWeave((s) => s.apply);
  if (!state.prompts.welcome) return null;
  const child = primaryChild(state);
  const [body, label, go] =
    todayState === 'pregnancy' || todayState === 'pregnancy_late' || todayState === 'pregnancy_with_child'
      ? [S.welcomePregnancy.text, S.welcomeAddMedicine.text, () => navigate('/me/medicines')]
      : todayState === 'postpartum_solids' || todayState === 'toddler'
        ? [t(S.welcomeSolids, { name: child?.name ?? '' }), S.welcomeLog.text, onFab]
        : todayState === 'postpartum_baby'
          ? [S.welcomeBaby.text, S.welcomeLog.text, onFab]
          : [S.welcomeCycle.text, S.welcomeOpenCycle.text, () => navigate('/me/cycle')];
  const start = () => {
    apply((s) => ({ ...s, prompts: { ...s.prompts, welcome: undefined } }));
    go();
  };
  return (
    <div data-testid="welcome-card">
      <ContextCard
        tag={S.welcomeTag.text}
        title={t(S.welcomeTitle, { name: state.her.name })}
        titleStyle="prompt"
        body={body}
        actions={<GhostButton onClick={start}>{label}</GhostButton>}
      />
    </div>
  );
}

function FinishBirthDetails({ state }: { state: DomainState }) {
  const navigate = useNavigate();
  if (!state.prompts.finishBirthDetails) return null;
  return <ContextCard title={S.finishBirthTitle.text} titleStyle="prompt" body={S.finishBirthBody.text} actions={<GhostButton onClick={() => navigate('/birth')} aria-label={S.finishBirthTitle.text}>{S.open.text}</GhostButton>} />;
}

function CourseBlock({ state, now }: { state: DomainState; now: Date }) {
  const { take, untake } = useDoseActions();
  const courses = activeCourses(state, now).filter((m) => m.subject.kind === 'child' && !m.archived);
  if (!courses.length) return null;
  return (
    <Section label={S.medicineCourse.text}>
      <ListCard>
        {courses.map((m) => {
          const day = Math.floor(minutesSince(m.course!.startedAt, now) / 1440) + 1;
          const slots = doseSlotsToday(state, now, m.subject);
          const taken = slots.filter((s) => s.medicine.id === m.id && s.takenAt).length;
          return (
            <ChecklistRow
              key={m.id}
              checked={taken > 0}
              label={m.name}
              sublabel={t(S.courseDay, { dose: m.doseText, day, days: m.course!.days })}
              value={taken ? formatTimeCompact(slots.find((s) => s.takenAt)!.takenAt!) : S.doseNotTaken.text}
              onToggle={() => {
                const slot = slots.find((x) => x.medicine.id === m.id);
                if (!slot) return;
                if (slot.takenAt) untake(m.id, slot.slot);
                else (beginLog('today.course'), take(m.id, slot.slot, 'today.course'));
              }}
              a11yLabel={`${m.name}, ${m.doseText}, day ${day} of ${m.course!.days}. ${taken ? 'Taken' : 'Not taken yet'}`}
            />
          );
        })}
      </ListCard>
    </Section>
  );
}

function TodaySoFar({ state, now, onFab }: { state: DomainState; now: Date; onFab: () => void }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState<string | null>(null);
  const items = timelineItems(state, now).map((i) => ({ ...i, onClick: () => setEditing(i.id), a11y: t(S.editEntryA11y, { what: i.text, time: i.time }) }));
  return (
    <Section
      label={S.todaySoFar.text}
      right={
        items.length ? (
          <button type="button" onClick={() => navigate('/timeline')} className="hit-44 type-micro normal-case font-semibold text-ink-3">
            {S.all.text}
          </button>
        ) : undefined
      }
    >
      <ActivityTimeline items={items} empty={<EmptyState line={S.nothingLoggedYet.text} action={S.nothingLoggedAction.text} onAction={onFab} />} />
      <EditLogSheet id={editing} onClose={() => setEditing(null)} />
    </Section>
  );
}

/* ---------------- Pregnancy ---------------- */

/** "Week 22" and "Due 14 January. Eighteen weeks to go.", shared by Today and the Pregnancy tab. */
export function pregnancyHeading(state: DomainState, now: Date) {
  const p = state.her.pregnancy!;
  const { week, day, gestationalDays } = pregnancyWeek(p.dueDate, now);
  const late = week >= STAGE_CONFIG.labourModeFromWeek;
  const daysToGo = 280 - gestationalDays;
  const weeksToGo = 40 - week;
  const title = late ? t(S.pregnancyWeekDayTitle, { n: week, d: day }) : t(S.pregnancyWeekTitle, { n: week });
  const subtitle =
    daysToGo < 0
      ? t(S.pastDue, { days: `${capitalise(numberWord(-daysToGo))} ${-daysToGo === 1 ? 'day' : 'days'}` })
      : daysToGo === 0
        ? S.dueToday.text
        : weeksToGo === 1
          ? t(S.dueLineOneWeek, { date: formatDayMonth(p.dueDate) })
          : t(S.dueLine, { date: formatDayMonth(p.dueDate), weeks: capitalise(numberWord(weeksToGo)) });
  return { week, day, gestationalDays, late, title, subtitle };
}

function PregnancyToday({ state, now, date, carousel, withChild }: { state: DomainState; now: Date; date: string; carousel: ReactNode; withChild?: Child }) {
  const navigate = useNavigate();
  const apply = useWeave((s) => s.apply);
  const { week, late, title, subtitle } = pregnancyHeading(state, now);

  const reading = readingForWeek(week);

  return (
    <>
      <ScreenHeader label={date} title={title} subtitle={subtitle} />
      {carousel}
      {withChild ? <ChildStrip state={state} now={now} child={withChild} /> : null}
      {/* Water and mood, the same tiles as every cycle tracker's Today (decision 2026-10-30). */}
      <HerTiles from="today" />
      {late ? (
        <ContextCard
          titleStyle="card"
          title={S.labourCardTitle.text}
          body={S.labourCardBody.text}
          actions={
            <PrimaryButton size="lg" onClick={() => apply((s, at) => startLabour(s, at))}>
              {S.labourCardAction.text}
            </PrimaryButton>
          }
        />
      ) : null}
      {/* From week 36 the Figma frame drops the medicines block; it stays if she has medicines scheduled. */}
      {!late || doseSlotsToday(state, now, { kind: 'her' }).length ? <MedicinesToday state={state} now={now} /> : null}
      {!late ? <ComingUp state={state} now={now} week={week} /> : null}
      {!late && reading.length ? (
        <Section label={t(S.weekReading, { n: week })}>
          <div className="flex flex-col gap-4">
            {reading.map((r) => (
              <ReadingCard key={r.id} category={r.category} headline={r.headline.text} body={r.body.text} review={r.review} />
            ))}
          </div>
        </Section>
      ) : null}
      <ThisWeek state={state} late={late} />
      {!late ? (
        <button type="button" onClick={() => navigate('/changed')} className="flex min-h-[44px] w-full items-center justify-between font-sans text-[13px] font-medium text-ink-2">
          <Copy entry={S.somethingChanged} />
          <Chevron className="text-ink-4" />
        </button>
      ) : null}
    </>
  );
}

/** Coming up (9.5, B30): booked appointments, then suggested checks from config. */
export function ComingUp({ state, now, week }: { state: DomainState; now: Date; week: number }) {
  const [target, setTarget] = useState<AppointmentTarget | null>(null);
  const appointments = state.appointments.filter((a) => a.at && parseDate(a.at) >= now).sort((a, b) => (a.at! < b.at! ? -1 : 1));
  const milestones = milestonesForWeek(week).filter((m) => !state.appointments.some((a) => a.milestoneId === m.id || (a.title === m.title.text && a.at)));
  return (
    <Section label={S.comingUp.text}>
      <ListCard>
        {!appointments.length && !milestones.length ? (
          <li className="flex min-h-[44px] items-center py-4">
            <span className="font-sans text-[13px] text-ink-2">{S.nothingBooked.text}</span>
          </li>
        ) : null}
        {appointments.map((a) => (
          <ListRow key={a.id} label={a.title} sublabel={`${formatLongDate(a.at!)}, ${format(parseDate(a.at!), 'HH:mm')}`} value={S.edit.text} onClick={() => setTarget({ kind: 'edit', appointment: a })} a11yLabel={`${a.title}, ${formatLongDate(a.at!)}. ${S.edit.text}`} />
        ))}
        {milestones.map((m) => (
          <ListRow key={m.id} label={m.title.text} sublabel={t(S.notBooked, { n: m.suggestedWeek })} value={S.book.text} onClick={() => setTarget({ kind: 'book', milestone: m })} a11yLabel={`${m.title.text}, ${t(S.notBooked, { n: m.suggestedWeek })}. ${S.book.text}`} review={m.review} />
        ))}
        <AddRow label={S.addAppointment.text} onClick={() => setTarget({ kind: 'new' })} />
      </ListCard>
      <AppointmentSheet target={target} onClose={() => setTarget(null)} />
    </Section>
  );
}

/** This week checklist (9.5). Hospital bag and birth plan toggle in one tap, with Undo. */
export function ThisWeek({ state, late }: { state: DomainState; late: boolean }) {
  const openProvider = useProviderSheet();
  const { openSharing } = useSharing();
  const [sheet, setSheet] = useState<'bag' | 'plan' | null>(null);
  const c = checklistOf(state);
  const partner = state.her.partnerName;
  // Each row opens its sheet (decision 2026-10-30): a packing list, and a birth plan to fill in and share.
  const bagText = bagValue(c);
  const planText = planValue(c, partner);
  const bag = <ListRow label={S.hospitalBag.text} value={bagText} chevron onClick={() => setSheet('bag')} a11yLabel={t(S.checklistOpenA11y, { label: S.hospitalBag.text, value: bagText })} />;
  const plan = <ListRow label={S.birthPlan.text} value={planText} chevron onClick={() => setSheet('plan')} a11yLabel={t(S.checklistOpenA11y, { label: S.birthPlan.text, value: planText })} review={c.birthPlanShared ? S.sharingIsMock.review : undefined} />;
  return (
    <Section label={S.thisWeek.text}>
      <ListCard>
        {late ? (
          <>
            {bag}
            {state.her.provider ? (
              <ListRow label={S.doctor.text} value={t(S.callShort, { name: state.her.provider.name.replace('Dr. ', '') })} onClick={() => openProvider()} a11yLabel={t(S.callA11y, { name: state.her.provider.name })} />
            ) : null}
            {plan}
          </>
        ) : (
          <>
            {plan}
            {bag}
            <ListRow label={S.labourModeRow.text} value={S.readyAtWeek36.text} />
            <ListRow label={S.sharing.text} value={partner ?? S.notShared.text} chevron onClick={openSharing} />
          </>
        )}
      </ListCard>
      <HospitalBagSheet open={sheet === 'bag'} onOpenChange={(o) => !o && setSheet(null)} />
      <BirthPlanSheet open={sheet === 'plan'} onOpenChange={(o) => !o && setSheet(null)} />
    </Section>
  );
}

/** Your medicines today (9.5): circle ticks a dose, the name opens edit (B29). */
export function MedicinesToday({ state, now }: { state: DomainState; now: Date }) {
  const [sheet, setSheet] = useState<{ open: boolean; editing?: Medicine }>({ open: false });
  const { take, untake } = useDoseActions();
  const slots = doseSlotsToday(state, now, { kind: 'her' });
  return (
    <Section label={S.medicinesToday.text} right={slots.length ? <span className="type-micro text-ink-3">{t(S.medicinesCount, { taken: slots.filter((s) => s.takenAt).length, total: slots.length })}</span> : undefined}>
      <ListCard>
        {slots.length === 0 ? (
          <li className="flex min-h-[44px] items-center py-4">
            <span className="font-sans text-[13px] text-ink-2">{S.medsNoneToday.text}</span>
          </li>
        ) : null}
        {slots.map((s) => (
          <ChecklistRow
            key={`${s.medicine.id}-${s.slot}`}
            checked={Boolean(s.takenAt)}
            label={s.medicine.name}
            sublabel={s.label}
            value={s.takenAt ? formatTimeCompact(s.takenAt) : S.doseNotTaken.text}
            onToggle={() => {
              if (s.takenAt) untake(s.medicine.id, s.slot);
              else {
                beginLog('today.medicines');
                take(s.medicine.id, s.slot, 'today.medicines');
              }
            }}
            onOpen={() => setSheet({ open: true, editing: s.medicine })}
            openLabel={t(S.medOpenA11y, { name: s.medicine.name })}
            a11yLabel={t(S.doseTickA11y, { name: s.medicine.name, dose: s.label, state: s.takenAt ? `Taken at ${formatTime(s.takenAt)}` : 'Not taken yet' })}
          />
        ))}
        <AddRow label={S.addSomethingYouTake.text} onClick={() => setSheet({ open: true })} />
      </ListCard>
      <MedicineSheet open={sheet.open} editing={sheet.editing} onOpenChange={(open) => setSheet((x) => ({ ...x, open }))} />
    </Section>
  );
}

/** Compact child strip for "pregnant again with a child" (B27, P1). */
function ChildStrip({ state, now, child }: { state: DomainState; now: Date; child: Child }) {
  const navigate = useNavigate();
  const meal = lastMeal(state, now, child);
  return (
    <button type="button" onClick={() => navigate('/baby')} aria-label={t(S.childStripA11y, { name: child.name })} className="flex min-h-[44px] w-full items-center justify-between rounded-list bg-surface px-4 py-3 text-left">
      <span className="flex items-center gap-2">
        <Avatar src={child.photo} name={child.name} />
        <span className="type-name text-ink">{child.name}</span>
        <span className="font-sans text-[12px] text-ink-2">{formatChildAge(child.dob, now)}</span>
      </span>
      <span className="font-sans text-[12px] text-ink-2">{meal ? t(S.lastMealAt, { time: formatTime(meal.at) }) : S.noMealYet.text}</span>
    </button>
  );
}

/** Visible placeholder for content that a later phase builds. Dev-styled, never product UI. */
export function PhaseNote({ phase, what }: { phase: number; what: string }) {
  return (
    <div className="w-full rounded-list border border-dashed border-review-line bg-review-bg/60 px-4 py-3 font-sans text-[12px] text-review-fg">
      <strong className="font-semibold">Phase {phase}:</strong> {what}
    </div>
  );
}
