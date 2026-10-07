import type { DomainState, Insight, ISODateTime } from '../domain/types';
import { fmt } from '../content/copy';
import { TEMPLATES, type TemplateKey } from './templates';

/**
 * Insight engine, PRD 11.1. Deterministic rules over local state; no LLM.
 * Rules return candidates; the engine filters snoozed ones, ranks escalations
 * first, then by priority and recency, and caps the carousel at four.
 */

export interface InsightContext {
  state: DomainState;
  now: Date;
}

export interface Candidate {
  /** Stable per occurrence, e.g. "R16:tin_1". Snoozes key on this. */
  id: string;
  template: TemplateKey;
  scope: Insight['scope'];
  params?: Record<string, string | number>;
  /** Higher shows first among info cards. */
  priority: number;
  /** When the triggering data happened; newer wins ties. */
  at: ISODateTime;
  /** Effect ids handled by the UI layer, e.g. "log_water", "close_tin:tin_1:finished". */
  effects?: string[];
  /** Escalation topic for the acknowledged row (11.3). */
  topic?: string;
}

export interface Rule {
  id: string;
  evaluate: (ctx: InsightContext) => Candidate[];
}

export interface RenderedInsight extends Insight {
  template: TemplateKey;
  actions: { label: string; effect: string }[];
  acknowledged: boolean;
  topic?: string;
}

export const MAX_CAROUSEL = 4;
/**
 * After a pregnancy ends without a birth, Weave stays quiet (9.10: no insights
 * on that path). Escalations still show. Length needs perinatal review.
 */
export const QUIET_AFTER_LOSS_DAYS = 14;

export function inQuietPeriod(state: DomainState, now: Date): boolean {
  const ended = [...state.history].reverse().find((h) => h.outcome === 'ended');
  return Boolean(ended && now.getTime() - new Date(ended.endedAt).getTime() < QUIET_AFTER_LOSS_DAYS * 864e5);
}
export const SNOOZE_MS = 24 * 3600_000;
/** Settings "Fewer" (B35): at most two info cards. */
export const FEWER_MAX = 2;

/** "Show fewer like this" (B32): mute a rule for a week. Escalations cannot be muted (11.3). */
export function muteRule(state: DomainState, ruleId: string, now: Date): DomainState {
  const key = `rule:${ruleId}`;
  return { ...state, insightMemory: { ...state.insightMemory, [key]: { snoozedUntil: new Date(now.getTime() + 7 * 864e5).toISOString() } } };
}

export function render(c: Candidate, memory: DomainState['insightMemory']): RenderedInsight {
  const t = TEMPLATES[c.template];
  const actions = t.actions.map((a, i) => ({ label: fmt(a, c.params), effect: c.effects?.[i] ?? 'dismiss' }));
  return {
    id: c.id,
    ruleId: t.ruleId,
    scope: c.scope,
    severity: t.severity,
    headline: fmt(t.headline, c.params),
    body: 'body' in t && t.body ? fmt(t.body, c.params) : undefined,
    action: actions[0],
    actions,
    template: c.template,
    acknowledged: Boolean(memory[c.id]?.acknowledgedAt),
    topic: c.topic,
  };
}

export function runInsights(rules: Rule[], ctx: InsightContext): RenderedInsight[] {
  const memory = ctx.state.insightMemory;
  const t = ctx.now.getTime();
  const quiet = inQuietPeriod(ctx.state, ctx.now);
  const fewer = ctx.state.settings?.insightFrequency === 'fewer';
  const candidates = rules
    .flatMap((r) => r.evaluate(ctx))
    .filter((c) => {
      if (TEMPLATES[c.template].severity === 'escalate') return true; // safety cards always show
      if (quiet) return false;
      // "Show fewer like this" (B32) mutes a rule for a week.
      const muted = memory[`rule:${TEMPLATES[c.template].ruleId}`]?.snoozedUntil;
      if (muted && new Date(muted).getTime() > t) return false;
      return !fewer || c.priority >= 3;
    });
  const visible = candidates.filter((c) => {
    const m = memory[c.id];
    const escalate = TEMPLATES[c.template].severity === 'escalate';
    // Escalations cannot be snoozed with "Not now" (11.3); they can only be acknowledged.
    if (escalate) return true;
    return !(m?.snoozedUntil && new Date(m.snoozedUntil).getTime() > t);
  });
  visible.sort((a, b) => {
    const ea = TEMPLATES[a.template].severity === 'escalate' ? 1 : 0;
    const eb = TEMPLATES[b.template].severity === 'escalate' ? 1 : 0;
    if (ea !== eb) return eb - ea;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.at < b.at ? 1 : -1;
  });
  // Per-rule cap: one card per rule id at a time (11.1 frequency cap).
  const seen = new Set<string>();
  const capped = visible.filter((c) => {
    const ruleId = TEMPLATES[c.template].ruleId;
    if (seen.has(ruleId) && TEMPLATES[c.template].severity !== 'escalate') return false;
    seen.add(ruleId);
    return true;
  });
  const max = fewer ? FEWER_MAX : MAX_CAROUSEL;
  const escalations = capped.filter((c) => TEMPLATES[c.template].severity === 'escalate');
  return capped.slice(0, Math.max(max, escalations.length)).map((c) => render(c, memory));
}

/** "Not now": 24 hour snooze. Ignored for escalations. */
export function snoozeInsight(state: DomainState, id: string, now: Date): DomainState {
  return { ...state, insightMemory: { ...state.insightMemory, [id]: { ...state.insightMemory[id], snoozedUntil: new Date(now.getTime() + SNOOZE_MS).toISOString() } } };
}

/** "I've seen this" on an escalation: collapses the card to a provider row (decision 2026-10-01). */
export function acknowledgeInsight(state: DomainState, id: string, now: Date): DomainState {
  return { ...state, insightMemory: { ...state.insightMemory, [id]: { ...state.insightMemory[id], acknowledgedAt: now.toISOString() } } };
}
