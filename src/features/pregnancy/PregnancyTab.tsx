import { Navigate, useNavigate } from 'react-router-dom';
import { S } from '../../content/strings';
import { t, Copy } from '../../components/Copy';
import { SelfCareSwitch, ScreenHeader } from '../../components/Shell';
import { ListCard, ListRow, Section } from '../../components/Cards';
import { ProgressRing } from '../../components/Controls';
import { ReviewFlag } from '../../components/ReviewFlag';
import { Chevron } from '../../components/Icon';
import { FETAL_REVIEW, fetalForWeek } from '../../content/fetal';
import { formatDayMonth, numberWord, parseDate } from '../../domain/dates';
import type { DomainState, LogEntry } from '../../domain/types';
import { useDomain } from '../../state/store';
import { useNow } from '../../state/clock';
import { ComingUp, pregnancyHeading, ThisWeek } from '../today/Today';

/**
 * Pregnancy tab (decision 2026-10-28): the journey over weeks, where Me is how
 * she is today. Progress, the baby this week, appointments, the checklist and
 * what has happened so far.
 */

const LB = 2.20462;

/** Trimesters by completed week: 1 to 13, 14 to 27, 28 on. */
const trimester = (week: number) => (week < 14 ? 1 : week < 28 ? 2 : 3);

function babyWeight(g: number, units: DomainState['her']['units']): string {
  if (units.weight === 'lb') return g < 450 ? `${Math.round((g / 1000) * LB * 16)} oz` : `${((g / 1000) * LB).toFixed(1)} lb`;
  return g < 1000 ? `${g} g` : `${(g / 1000).toFixed(1)} kg`;
}

const babyLength = (mm: number) => (mm < 100 ? `${(mm / 10).toFixed(1)} cm` : `${Math.round(mm / 10)} cm`);

export function PregnancyTab() {
  const state = useDomain();
  const now = useNow();
  const navigate = useNavigate();
  if (state.her.phase !== 'pregnancy' || !state.her.pregnancy) return <Navigate to="/today" replace />;
  const { week, gestationalDays, late, title, subtitle } = pregnancyHeading(state, now);
  const fetal = fetalForWeek(week);
  const tri = trimester(week);

  const herLogs = (type: LogEntry['type']) =>
    state.logs.filter((l) => l.subject.kind === 'her' && l.type === type && parseDate(l.at) <= now).sort((a, b) => (a.at < b.at ? -1 : 1));
  const weights = herLogs('weight').filter((l): l is Extract<LogEntry, { type: 'weight' }> => l.type === 'weight');
  const symptoms = herLogs('symptom').filter((l): l is Extract<LogEntry, { type: 'symptom' }> => l.type === 'symptom');
  const past = state.appointments.filter((a) => a.at && parseDate(a.at) < now).sort((a, b) => (a.at! < b.at! ? 1 : -1));
  const kg = (v: number) => (state.her.units.weight === 'lb' ? `${(v * LB).toFixed(1)} lb` : `${v.toFixed(1)} kg`);
  const weightValue = !weights.length
    ? S.noneLogged.text
    : weights.length === 1
      ? kg(weights[0]!.kg)
      : t(S.pregWeightRange, { from: kg(weights[0]!.kg), to: kg(weights.at(-1)!.kg) });
  const symptomValue = symptoms.length ? t(S.pregSymptomsValue, { n: symptoms.length, last: symptoms.at(-1)!.name }) : S.noneLogged.text;

  return (
    <div className="flex flex-col gap-5" data-screen="pregnancy">
      <ScreenHeader label={S.navPregnancy.text} title={title} subtitle={subtitle} />
      <SelfCareSwitch current="pregnancy" />

      <section aria-label={t(S.pregProgressA11y, { week, tri: numberWord(tri) })} className="flex flex-col items-center gap-4 rounded-list border border-ink/8 bg-surface p-[25px] shadow-card">
        <ProgressRing value={Math.min(1, gestationalDays / 280)} label={t(S.pregnancyWeekCard, { n: week })}>
          <span className="type-insight text-ink">{t(S.pregnancyWeekRing, { n: week })}</span>
        </ProgressRing>
        <div className="flex w-full flex-col gap-2">
          <div aria-hidden className="flex gap-1">
            {[1, 2, 3].map((n) => (
              <span key={n} className={`h-1.5 flex-1 rounded-full ${n < tri ? 'bg-sage-600' : n === tri ? 'bg-olive-500' : 'bg-line'}`} />
            ))}
          </div>
          <p className="text-center font-sans text-[13px] font-medium text-ink-2">{t(S.pregTrimester, { tri: ['First', 'Second', 'Third'][tri - 1]! })}</p>
        </div>
        <Copy as="p" entry={S.pregnancySupportLine} className="text-center font-serif text-[14px] text-ink-2 italic" />
      </section>

      {fetal ? (
        <Section label={S.pregBabyThisWeek.text}>
          <ReviewFlag review={FETAL_REVIEW} className="rounded-card">
            <article data-testid="fetal-card" className="flex flex-col gap-4 rounded-card bg-surface p-5">
              <div className="flex items-center gap-4">
                <SizeVisual week={fetal.week} emoji={fetal.size.emoji} />
                <p data-testid="fetal-size" className="font-serif text-[22px] leading-tight text-ink">
                  {t(S.pregSizeOf, { thing: fetal.size.thing.text })}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <dt className="type-micro text-ink-3">{S.pregLength.text}</dt>
                  <dd className="type-insight text-ink">{t(S.pregAbout, { v: babyLength(fetal.lengthMm) })}</dd>
                </div>
                {fetal.weightG ? (
                  <div className="flex flex-col gap-1">
                    <dt className="type-micro text-ink-3">{S.pregWeight.text}</dt>
                    <dd className="type-insight text-ink">{t(S.pregAbout, { v: babyWeight(fetal.weightG, state.her.units) })}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="type-body text-ink">{fetal.line.text}</p>
              <p className="font-sans text-[12px] text-ink-2">{S.pregSizeNote.text}</p>
            </article>
          </ReviewFlag>
        </Section>
      ) : null}

      <ComingUp state={state} now={now} week={week} />
      <ThisWeek state={state} late={late} />

      <Section label={S.pregSoFar.text}>
        <ListCard>
          <ListRow size="lg" label={S.meWeight.text} value={weightValue} />
          <ListRow size="lg" label={S.meSymptoms.text} value={symptomValue} />
          {past.map((a) => (
            <ListRow key={a.id} size="lg" label={a.title} value={formatDayMonth(a.at!)} />
          ))}
          <ListRow size="lg" label={S.pregAllLogs.text} chevron onClick={() => navigate('/timeline')} />
        </ListCard>
      </Section>

      {!late ? (
        <button type="button" onClick={() => navigate('/changed')} className="flex min-h-[44px] w-full items-center justify-between font-sans text-[13px] font-medium text-ink-2">
          <Copy entry={S.somethingChanged} />
          <Chevron className="text-ink-4" />
        </button>
      ) : null}
    </div>
  );
}

/**
 * The size comparison as a picture (decision 2026-10-31): the fruit in a soft
 * circle, drawn larger as the weeks go on, so the growth shows from week to
 * week. Decorative; the sentence beside it says the same.
 */
function SizeVisual({ week, emoji }: { week: number; emoji?: string }) {
  const grow = Math.min(1, Math.max(0, (week - 4) / 36));
  return (
    <span aria-hidden className="grid size-[88px] shrink-0 place-items-center rounded-full bg-chip-her-bg">
      {emoji ? (
        <span className="leading-none" style={{ fontSize: `${Math.round(30 + grow * 26)}px` }}>
          {emoji}
        </span>
      ) : (
        <span className="size-1.5 rounded-full bg-ink" />
      )}
    </span>
  );
}
