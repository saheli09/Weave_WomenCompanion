import { useState } from 'react';
import { S } from '../../content/strings';
import { t, Copy } from '../../components/Copy';
import { PrimaryButton, SecondaryButton, TextAction } from '../../components/Button';
import { ChecklistRow, ListCard, Section } from '../../components/Cards';
import { BarStrip, ContractionDial } from '../../components/Controls';
import { EscalationCard } from '../../components/Insight';
import { ReviewTag, useReviewMarkers } from '../../components/ReviewFlag';
import { Chevron } from '../../components/Icon';
import { formatDuration, formatLongDate, minutesSince } from '../../domain/dates';
import { formatClock, formatSeconds, labourStats } from '../../domain/labour';
import { endContraction, exitLabour, startContraction } from '../../domain/transitions';
import { useDomain, useWeave } from '../../state/store';
import { useNow } from '../../state/clock';
import { useInsights } from '../../insights/useInsights';
import { beginLog, commitLog } from '../../metrics/timeToLog';
import { useProviderSheet } from '../../app/ProviderSheet';
import { useNavigate } from 'react-router-dom';
import { NoteSheet } from '../quicklog/HerLogSheets';
import { useWakeLock } from './useWakeLock';

/**
 * Labour mode (9.6). Weave strips back to the timer and a note field: the nav
 * is hidden (App), the screen stays awake, and nothing here needs a network.
 *  - Summary (S10) between contractions
 *  - Dial (S11) while one is running
 * A provider is always one tap away (design addition), and when all three
 * signs are met the R13 escalation sits on top.
 */
export function LabourScreen() {
  const state = useDomain();
  const now = useNow(1000);
  const labour = state.her.pregnancy!.labour!;
  const stats = labourStats(labour.contractions, now);
  useWakeLock(true);
  return stats.running ? <DialView startedAt={stats.running.start} now={now} /> : <SummaryView labourStart={labour.startedAt} stats={stats} now={now} />;
}

function Header({ elapsedMin }: { elapsedMin: number }) {
  const apply = useWeave((s) => s.apply);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-[22px] items-center justify-between">
        <p className="type-micro text-ink-3">{t(S.labourHeader, { elapsed: formatDuration(elapsedMin) })}</p>
        <button type="button" onClick={() => setConfirm(true)} className="hit-44 font-sans text-[11px] font-medium text-ink-3">
          {S.exit.text}
        </button>
      </div>
      {confirm ? (
        <div role="alertdialog" aria-label={S.labourExitConfirm.text} className="flex items-center justify-between gap-3 rounded-tile bg-surface px-4 py-2">
          <span className="font-sans text-[13px] text-ink">{S.labourExitConfirm.text}</span>
          <span className="flex">
            <TextAction onClick={() => setConfirm(false)}>{S.labourStay.text}</TextAction>
            <TextAction className="!text-ink" onClick={() => apply((s, at) => exitLabour(s, at))}>
              {S.labourLeave.text}
            </TextAction>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function SummaryView({ labourStart, stats, now }: { labourStart: string; stats: ReturnType<typeof labourStats>; now: Date }) {
  const apply = useWeave((s) => s.apply);
  const openProvider = useProviderSheet();
  const navigate = useNavigate();
  const markers = useReviewMarkers();
  const { insights, ...handlers } = useInsights();
  const r13 = insights.find((i) => i.ruleId === 'R13');
  const [note, setNote] = useState(false);
  const dash = S.labourStatPlaceholder.text;

  const stat = (value: string, caption: string) => (
    <div className="flex flex-col gap-1">
      <p className="type-stat text-ink">{value}</p>
      <p className="font-sans text-[12px] leading-[1.4] text-ink-3">{caption}</p>
    </div>
  );

  return (
    <div className="flex min-h-full flex-col justify-between gap-8" data-labour-view="summary">
      <div className="flex flex-col gap-8">
        <Header elapsedMin={minutesSince(labourStart, now)} />
        {r13 ? <EscalationCard insight={r13} {...handlers} /> : null}
        <section aria-label={S.sinceLastContraction.text} className="flex flex-col gap-[43px] rounded-card bg-surface p-5">
          <div className="flex flex-col gap-5">
            <h2 className="font-serif text-[20px] leading-[1.3] font-medium text-ink-3">{S.sinceLastContraction.text}</h2>
            {stats.sinceLastSec !== undefined ? (
              <p className="type-hero text-ink" role="timer" aria-live="off">
                {formatClock(stats.sinceLastSec)}
              </p>
            ) : (
              <p className="type-body text-ink-2">{S.labourNoContractions.text}</p>
            )}
            <div className="flex gap-[50px] px-[5px]">
              {stat(String(stats.count), S.contractionsLogged.text)}
              {stat(stats.avgGapSec !== undefined ? formatSeconds(stats.avgGapSec) : dash, S.averageGap.text)}
              {stat(stats.avgDurationSec !== undefined ? formatSeconds(stats.avgDurationSec) : dash, S.averageLength.text)}
            </div>
          </div>
          <BarStrip bars={stats.bars} now={now.getTime()} startLabel={S.anHourAgo.text} endLabel={S.now.text} label={t(S.labourBarsA11y, { count: stats.bars.length })} />
        </section>

        <Section label={t(S.signsCount, { met: stats.signsMet })} right={markers && S.signsCount.review ? <ReviewTag review={S.signsCount.review} /> : undefined}>
          <ListCard radius="list">
            <ChecklistRow dense checked={stats.signs.apart} label={S.signApart.text} value={stats.avgGapSec !== undefined ? formatSeconds(stats.avgGapSec) : dash} a11yLabel={`${S.signApart.text}: ${stats.signs.apart ? 'met' : 'not yet'}`} />
            <ChecklistRow dense checked={stats.signs.lasting} label={S.signLasting.text} value={stats.avgDurationSec !== undefined ? formatSeconds(stats.avgDurationSec) : dash} a11yLabel={`${S.signLasting.text}: ${stats.signs.lasting ? 'met' : 'not yet'}`} />
            <ChecklistRow dense checked={stats.signs.holding} label={S.signHolding.text} value={t(S.holdingValue, { min: Math.round(stats.holdingMin) })} a11yLabel={`${S.signHolding.text}: ${stats.signs.holding ? 'met' : 'not yet'}`} />
          </ListCard>
        </Section>
      </div>

      <div className="flex flex-col gap-5">
        <PrimaryButton
          size="lg"
          hint={S.contractionHint.text}
          onClick={() => {
            beginLog('labour.contraction');
            apply((s, at) => startContraction(s, at));
            commitLog('contraction');
          }}
        >
          {S.contraction.text}
        </PrimaryButton>
        <SecondaryButton size="lg" onClick={() => navigate('/birth')}>
          {S.babyIsHere.text}
        </SecondaryButton>
        <ListCard radius="list">
          <li>
            <button type="button" onClick={openProvider} className="flex min-h-[52px] w-full items-center justify-between gap-3 text-left">
              <Copy entry={S.labourCallRow} className="type-row text-ink" />
              <Chevron className="text-ink-4" />
            </button>
          </li>
          <li>
            <button type="button" onClick={() => setNote(true)} className="flex min-h-[52px] w-full items-center justify-between gap-3 text-left">
              <span className="type-row text-ink">{S.labourAddNote.text}</span>
              <Chevron className="text-ink-4" />
            </button>
          </li>
        </ListCard>
      </div>
      <NoteSheet open={note} onOpenChange={setNote} entry="labour.note" />
    </div>
  );
}

function DialView({ startedAt, now }: { startedAt: string; now: Date }) {
  const apply = useWeave((s) => s.apply);
  const seconds = Math.max(0, (now.getTime() - new Date(startedAt).getTime()) / 1000);
  return (
    <div className="flex min-h-full flex-col justify-between gap-8" data-labour-view="dial">
      <div className="flex flex-col gap-6">
        <p className="type-micro text-ink-3">{formatLongDate(now)}</p>
        <div className="flex flex-col items-center gap-10 p-5">
          <p className="w-full font-sans text-[12px] font-medium tracking-wide text-ink-3 uppercase">{S.thisOne.text}</p>
          <div aria-label={t(S.dialA11y, { time: formatClock(seconds) })}>
            <ContractionDial seconds={seconds} />
          </div>
          <Copy as="p" entry={S.breathe} className="text-center font-sans text-[13px] leading-[1.4] text-ink-3" />
        </div>
      </div>
      <PrimaryButton size="lg" tone="sage" hint={S.easingHint.text} onClick={() => apply((s, at) => endContraction(s, at))}>
        {S.easing.text}
      </PrimaryButton>
    </div>
  );
}
