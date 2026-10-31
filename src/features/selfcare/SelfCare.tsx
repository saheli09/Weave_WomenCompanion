import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { S } from '../../content/strings';
import { t } from '../../components/Copy';
import { Section } from '../../components/Cards';
import { PrimaryButton, SecondaryButton } from '../../components/Button';
import { ReviewFlag } from '../../components/ReviewFlag';
import { BREATHE, careItem, type CareItem, type CareTone } from '../../content/selfcare';
import { careFor, planDaysDone, togglePlanDay } from '../../selfcare/library';
import { useDomain, useWeave } from '../../state/store';
import { useNow } from '../../state/clock';

/**
 * Self-care library (decision 2026-10-30): exercise plans, short guided
 * routines, comfort food and a minute of breathing, picked for her stage.
 * The rows sit on Self care; each item opens its own screen under /me/care.
 */

const TONE: Record<CareTone, string> = {
  pink: 'bg-chip-her-bg',
  olive: 'bg-olive-500/20',
  sage: 'bg-sage-600/12',
  sand: 'bg-line',
};

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

/** A small drawing for each kind: rising steps for a plan, play for a video, a bowl for food. */
function KindGlyph({ kind }: { kind: CareItem['kind'] }) {
  const common = { 'aria-hidden': true, width: 28, height: 28, viewBox: '0 0 28 28', fill: 'none', stroke: 'var(--color-ink-2)', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (kind === 'plan') return <svg {...common}><path d="M4 22h5v-5h5v-5h5V7h5" /></svg>;
  if (kind === 'video')
    return (
      <svg {...common}>
        <circle cx="14" cy="14" r="10" />
        <path d="M12 10l6 4-6 4z" fill="var(--color-ink-2)" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M4 13h20a10 10 0 0 1-20 0z" />
      <path d="M10 9c0-2 2-2 2-4M15 9c0-2 2-2 2-4" />
    </svg>
  );
}

const meta = (item: CareItem) =>
  item.kind === 'plan'
    ? `${t(S.careMinutes, { n: item.minutes })} · ${t(item.unit === 'week' ? S.carePlanWeeks : S.carePlanDays, { n: item.days.length })}`
    : t(S.careMinutes, { n: item.minutes });

function CareCard({ item, done }: { item: CareItem; done?: string }) {
  const navigate = useNavigate();
  return (
    <li className="shrink-0 snap-start">
      <button
        type="button"
        onClick={() => navigate(`/me/care/${item.kind}/${item.id}`)}
        className={`flex h-[156px] w-[188px] flex-col justify-between rounded-card p-4 text-left ${TONE[item.tone]}`}
      >
        <span className="flex items-start justify-between gap-2">
          <span className="font-serif text-[17px] leading-snug text-ink">{item.title.text}</span>
          <span className="shrink-0">
            <KindGlyph kind={item.kind} />
          </span>
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="line-clamp-2 font-sans text-[12px] leading-snug text-ink-2">{item.blurb.text}</span>
          <span className="font-sans text-[11px] font-semibold text-ink-2">{done ?? meta(item)}</span>
        </span>
      </button>
    </li>
  );
}

function Row({ label, items }: { label: string; items: CareItem[] }) {
  const state = useDomain();
  if (!items.length) return null;
  return (
    <Section label={label}>
      <ul tabIndex={0} aria-label={label} className="-mx-5 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {items.map((item) => {
          const done = item.kind === 'plan' ? planDaysDone(state, item.id).length : 0;
          return <CareCard key={item.id} item={item} done={item.kind === 'plan' && done ? t(S.carePlanProgress, { done, total: item.days.length }) : undefined} />;
        })}
      </ul>
    </Section>
  );
}

/** The library rows on Self care: Move, Watch, Eat well, Breathe. */
export function CareLibrary() {
  const state = useDomain();
  const now = useNow();
  const navigate = useNavigate();
  const { plans, videos, foods } = careFor(state, now);
  return (
    <ReviewFlag review={BREATHE.review} className="rounded-card">
      <div data-testid="care-library" className="flex flex-col gap-5">
        <Row label={S.careMove.text} items={plans} />
        <Row label={S.careWatch.text} items={videos} />
        <Row label={S.careEat.text} items={foods} />
        <Section label={S.careBreathe.text}>
          <button type="button" onClick={() => navigate('/me/care/breathe')} className="flex w-full items-center gap-4 rounded-card bg-surface p-5 text-left">
            <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-hydration/25">
              <span className="size-7 rounded-full bg-hydration/60" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="type-insight-sm text-ink">{S.careBreatheTitle.text}</span>
              <span className="font-sans text-[13px] text-ink-2">{S.careBreatheBody.text}</span>
            </span>
          </button>
        </Section>
      </div>
    </ReviewFlag>
  );
}

/* ------------------------------------------------------------- item screens */

function Steps({ label, steps }: { label: string; steps: { text: string }[] }) {
  return (
    <Section label={label}>
      <ol className="flex flex-col gap-3 rounded-card bg-surface p-5">
        {steps.map((s, i) => (
          <li key={s.text} className="flex gap-3">
            <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-line font-sans text-[12px] font-semibold text-ink-2">
              {i + 1}
            </span>
            <span className="type-body text-ink">{s.text}</span>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Intro({ item }: { item: CareItem }) {
  return (
    <div className={`flex items-start justify-between gap-3 rounded-card p-5 ${TONE[item.tone]}`}>
      <span className="flex flex-col gap-1">
        <span className="type-body text-ink">{item.blurb.text}</span>
        <span className="font-sans text-[12px] font-semibold text-ink-2">{meta(item)}</span>
      </span>
      <KindGlyph kind={item.kind} />
    </div>
  );
}

export function CareItemScreen() {
  const { kind, id } = useParams();
  const item = id ? careItem(id) : undefined;
  if (!item || item.kind !== kind) return <Navigate to="/me" replace />;
  return (
    <div className="flex flex-col gap-6" data-screen={`care-${item.kind}`}>
      <BackHeader title={item.title.text} />
      <ReviewFlag review={item.review} className="rounded-card">
        <Intro item={item} />
      </ReviewFlag>
      {item.kind === 'plan' ? <PlanDays planId={item.id} days={item.days} /> : null}
      {item.kind === 'video' ? (
        <>
          <VideoMock title={item.title.text} />
          <Steps label={S.careRoutine.text} steps={item.steps} />
        </>
      ) : null}
      {item.kind === 'food' ? (
        <>
          <Section label={S.careWhyHelps.text}>
            <p className="type-body rounded-card bg-surface p-5 text-ink">{item.why.text}</p>
          </Section>
          <Section label={S.careYouNeed.text}>
            <ul className="flex flex-col gap-2 rounded-card bg-surface p-5">
              {item.ingredients.map((x) => (
                <li key={x} className="flex items-center gap-3 type-body text-ink">
                  <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-olive-500" />
                  {x}
                </li>
              ))}
            </ul>
          </Section>
          <Steps label={S.careHowTo.text} steps={item.steps} />
        </>
      ) : null}
      {item.kind !== 'food' ? <p className="font-sans text-[12px] text-ink-2">{S.careStopIf.text}</p> : null}
    </div>
  );
}

function VideoMock({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <button type="button" disabled aria-label={t(S.careVideoPlayA11y, { title })} className="grid aspect-video w-full place-items-center rounded-card bg-ink/85">
        <span aria-hidden className="grid size-14 place-items-center rounded-full bg-surface/90">
          <span className="ml-1 size-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-ink" />
        </span>
      </button>
      <p className="font-sans text-[12px] text-ink-2">{S.careVideoMock.text}</p>
    </div>
  );
}

function PlanDays({ planId, days }: { planId: string; days: { title: { text: string }; steps: { text: string }[] }[] }) {
  const state = useDomain();
  const apply = useWeave((s) => s.apply);
  const done = planDaysDone(state, planId);
  return (
    <div className="flex flex-col gap-3">
      <p className="type-micro text-ink-2" data-testid="plan-progress">
        {t(S.carePlanProgress, { done: done.length, total: days.length })}
      </p>
      <ol className="flex flex-col gap-3">
        {days.map((d, i) => {
          const isDone = done.includes(i);
          return (
            <li key={d.title.text} aria-label={t(S.carePlanDayA11y, { title: d.title.text, state: isDone ? S.carePlanDone.text : S.carePlanMark.text })} className={`flex flex-col gap-3 rounded-card p-5 ${isDone ? 'bg-olive-500/15' : 'bg-surface'}`}>
              <div className="flex items-center gap-3">
                <span aria-hidden className={`grid size-7 shrink-0 place-items-center rounded-full font-sans text-[12px] font-semibold ${isDone ? 'bg-olive-500 text-surface' : 'bg-line text-ink-2'}`}>
                  {isDone ? '✓' : i + 1}
                </span>
                <h2 className="type-insight-sm text-ink">{d.title.text}</h2>
              </div>
              <ul className="flex flex-col gap-1.5 pl-10">
                {d.steps.map((s) => (
                  <li key={s.text} className="font-sans text-[14px] leading-snug text-ink-2">
                    {s.text}
                  </li>
                ))}
              </ul>
              <div className="pl-10">
                {isDone ? (
                  <SecondaryButton onClick={() => apply((s) => togglePlanDay(s, planId, i))}>{S.carePlanUnmark.text}</SecondaryButton>
                ) : (
                  <PrimaryButton tone="sage" onClick={() => apply((s) => togglePlanDay(s, planId, i))}>
                    {S.carePlanMark.text}
                  </PrimaryButton>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** A minute of box breathing: a circle that grows, holds, shrinks and holds, with the count. */
export function BreatheScreen() {
  const [t0, setT0] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const total = BREATHE.rounds * BREATHE.phases.length * BREATHE.count;
  useEffect(() => {
    if (t0 === null) return;
    const id = window.setInterval(() => setTick(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => window.clearInterval(id);
  }, [t0]);
  const running = t0 !== null && tick < total;
  const finished = t0 !== null && tick >= total;
  const phase = Math.floor(tick / BREATHE.count) % BREATHE.phases.length;
  const count = BREATHE.count - (tick % BREATHE.count);
  // In: grow over the count. Hold after in: stay big. Out: shrink. Hold after out: stay small.
  const big = running && (phase === 0 || phase === 1);
  return (
    <div className="flex flex-col gap-6" data-screen="care-breathe">
      <BackHeader title={S.careBreatheTitle.text} />
      <p className="type-body text-ink-2">{S.careBreatheBody.text}</p>
      <div className="grid place-items-center py-6">
        <div className="relative grid size-64 place-items-center">
          <span aria-hidden className="absolute inset-0 rounded-full bg-hydration/15" />
          <span
            aria-hidden
            className="absolute inset-6 rounded-full bg-hydration/45 ease-in-out"
            style={{ transform: `scale(${big ? 1 : 0.55})`, transition: `transform ${BREATHE.count}s` }}
          />
          <span role="status" aria-live="polite" className="relative flex flex-col items-center gap-1 text-center">
            {running ? (
              <>
                <span className="font-sans text-[15px] font-semibold text-ink">{BREATHE.phases[phase]!.text}</span>
                <span className="font-serif text-[40px] leading-none text-ink">{count}</span>
              </>
            ) : finished ? (
              <span className="px-6 font-serif text-[20px] text-ink">{S.careBreatheEnd.text}</span>
            ) : null}
          </span>
        </div>
      </div>
      {!running ? (
        <PrimaryButton size="lg" tone="sage" onClick={() => (setTick(0), setT0(Date.now()))}>
          {finished ? S.careBreatheAgain.text : S.careBreatheStart.text}
        </PrimaryButton>
      ) : null}
    </div>
  );
}
