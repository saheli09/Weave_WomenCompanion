import { useEffect, useRef, useState, type UIEvent } from 'react';
import type { RenderedInsight } from '../insights/engine';
import { TEMPLATES } from '../insights/templates';
import { S } from '../content/strings';
import { t } from './Copy';
import { PrimaryButton, TextAction } from './Button';
import { ReviewTag, useReviewMarkers } from './ReviewFlag';

/**
 * InsightCard (7.5): sage "Noticing" card. Sage is reserved for AI
 * observations (7.1). Escalations use the design-addition style: neutral
 * surface, terracotta accent bar, one provider action, no "Not now" (11.3).
 */

export interface InsightHandlers {
  onAction: (insight: RenderedInsight, effect: string) => void;
  onNotNow: (insight: RenderedInsight) => void;
  onAcknowledge: (insight: RenderedInsight) => void;
  onExplain?: (insight: RenderedInsight) => void;
}

function Reviews({ insight }: { insight: RenderedInsight }) {
  const on = useReviewMarkers();
  if (!on) return null;
  const tpl = TEMPLATES[insight.template];
  const all = [tpl.headline.review, 'body' in tpl ? tpl.body?.review : undefined].filter((r): r is NonNullable<typeof r> => Boolean(r));
  const reviews = all.filter((r, i) => all.findIndex((x) => x.kind === r.kind && x.ref === r.ref) === i);
  if (!reviews.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {reviews.map((r, i) => (
        <ReviewTag key={i} review={r!} />
      ))}
    </div>
  );
}

export function InsightCard({ insight, compact = false, ...h }: { insight: RenderedInsight; compact?: boolean } & InsightHandlers) {
  if (insight.severity === 'escalate') return <EscalationCard insight={insight} {...h} />;
  const primary = insight.actions.find((a) => a.label !== S.notNow.text);
  const hasNotNow = insight.actions.some((a) => a.label === S.notNow.text) || insight.actions.length <= 1;
  return (
    <article aria-label={`${S.noticing.text}: ${insight.headline}`} className="flex w-full flex-col gap-4 rounded-card bg-sage-100 p-5">
      <div className="flex items-center gap-1.5">
        <span aria-hidden className="size-1.5 rounded-full bg-sage-600" />
        <span className="type-micro text-sage-600">{S.noticing.text}</span>
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => h.onExplain?.(insight)}
          className={`hit-44 text-left text-ink ${compact ? 'type-insight-sm' : 'type-insight'}`}
          aria-describedby={insight.body ? `${insight.id}-body` : undefined}
          title={S.explainHint.text}
        >
          {insight.headline}
        </button>
        {insight.body ? (
          <p id={`${insight.id}-body`} className="type-body text-ink-2">
            {insight.body}
          </p>
        ) : null}
        <Reviews insight={insight} />
      </div>
      {primary || hasNotNow ? (
        <div className="flex flex-wrap items-center gap-4">
          {primary ? (
            <PrimaryButton tone="sage" onClick={() => h.onAction(insight, primary.effect)}>
              {primary.label}
            </PrimaryButton>
          ) : null}
          {insight.actions
            .filter((a) => a !== primary && a.label !== S.notNow.text)
            .map((a) => (
              <TextAction key={a.label} onClick={() => h.onAction(insight, a.effect)}>
                {a.label}
              </TextAction>
            ))}
          {hasNotNow && primary ? <TextAction onClick={() => h.onNotNow(insight)}>{S.notNow.text}</TextAction> : null}
        </div>
      ) : null}
    </article>
  );
}

export function EscalationCard({ insight, onAction, onAcknowledge }: { insight: RenderedInsight } & InsightHandlers) {
  const primary = insight.actions[0];
  if (insight.acknowledged) {
    return (
      <button
        type="button"
        onClick={() => primary && onAction(insight, primary.effect)}
        className="flex min-h-[44px] w-full items-center gap-3 rounded-list border-l-4 border-terracotta bg-surface px-4 py-3 text-left"
      >
        <span className="type-secondary font-semibold text-ink">{t(S.acknowledgedRow, { topic: insight.topic ?? 'this' })}</span>
      </button>
    );
  }
  return (
    <article role="alert" aria-label={insight.headline} className="relative flex w-full flex-col gap-4 overflow-hidden rounded-card bg-surface p-5 pl-6">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-terracotta" />
      <span className="type-micro text-terracotta-ink">{S.escalationLabel.text}</span>
      <div className="flex flex-col gap-2">
        <h3 className="type-insight text-ink">{insight.headline}</h3>
        {insight.body ? <p className="type-body text-ink-2">{insight.body}</p> : null}
        <Reviews insight={insight} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {primary ? (
          <PrimaryButton tone="ink" onClick={() => onAction(insight, primary.effect)}>
            {primary.label}
          </PrimaryButton>
        ) : null}
        <TextAction onClick={() => onAcknowledge(insight)}>{S.acknowledge.text}</TextAction>
      </div>
    </article>
  );
}

/** Up to four cards, swipeable, dots below (9.1). */
export function InsightCarousel({ insights, ...h }: { insights: RenderedInsight[] } & InsightHandlers) {
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const ids = insights.map((i) => i.id).join('|');
  // When the set changes (a new escalation or a higher-priority card), show the first card again.
  // Scroll snapping would otherwise keep the previously visible card in view.
  useEffect(() => {
    ref.current?.scrollTo({ left: 0 });
    setIndex(0);
  }, [ids]);
  if (!insights.length) return null;
  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };
  return (
    <section aria-roledescription="carousel" aria-label={S.noticing.text} className="flex w-full flex-col items-center gap-2.5">
      <div ref={ref} onScroll={onScroll} className="flex w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {insights.map((i, n) => (
          <div key={i.id} className="w-full shrink-0 snap-center" aria-roledescription="slide" aria-label={t(S.insightPager, { n: n + 1, total: insights.length })}>
            <InsightCard insight={i} {...h} />
          </div>
        ))}
      </div>
      {insights.length > 1 ? (
        // Dots are an indicator, as in Figma; swiping and screen-reader slide order do the navigating.
        // Interactive 6px dots could not meet the 44px target (PRD 15).
        <div className="flex h-1.5 gap-0.5" aria-hidden>
          {insights.map((i, n) => (
            <span key={i.id} className={`mx-px size-1.5 rounded-full ${n === index ? 'bg-ink' : 'bg-ink-4'}`} />
          ))}
        </div>
      ) : (
        <span aria-hidden className="h-1.5" />
      )}
      <span className="sr-only" aria-live="polite">
        {t(S.insightPager, { n: index + 1, total: insights.length })}
      </span>
    </section>
  );
}
