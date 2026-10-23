import { useMemo } from 'react';
import { useDomain, useWeave } from '../state/store';
import { useNow } from '../state/clock';
import { acknowledgeInsight, runInsights, snoozeInsight, type RenderedInsight } from './engine';
import type { InsightHandlers } from '../components/Insight';
import { RULES } from './rules';
import { useDoseActions } from '../features/medicines/useDoseActions';
import { useHerLogs } from '../features/quicklog/useHerLogs';
import { beginLog } from '../metrics/timeToLog';
import { useProviderSheet } from '../app/ProviderSheet';
import { useFormulaFlow } from '../features/formula/Formula';
import { useExplain } from './ExplainProvider';
import { startLabour } from '../domain/transitions';

/** Runs the engine against the store and the demo clock. Recomputes when either changes (16.3). */
export function useInsights(): { insights: RenderedInsight[] } & InsightHandlers {
  const domain = useDomain();
  const apply = useWeave((s) => s.apply);
  const now = useNow(60_000);
  const { take } = useDoseActions();
  const { logWater } = useHerLogs();
  const openProvider = useProviderSheet();
  const { closeTin } = useFormulaFlow();
  const explain = useExplain();
  const minute = Math.floor(now.getTime() / 60_000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const insights = useMemo(() => runInsights(RULES, { state: domain, now }), [domain, minute]);
  return {
    insights,
    onAction: (i, effect) => {
      const [kind, a, b] = effect.split(':');
      if (kind === 'log_dose' && a && b) {
        beginLog('insight');
        take(a, b, 'insight');
      } else if (kind === 'log_water') logWater('insight');
      else if (kind === 'call_provider') openProvider();
      else if (kind === 'support') openProvider('support');
      else if (kind === 'close_tin' && a && (b === 'finished' || b === 'discarded')) closeTin(a, b);
      else if (kind === 'start_labour') apply((s, at) => startLabour(s, at));
      else apply((s, at) => snoozeInsight(s, i.id, at));
    },
    onNotNow: (i) => apply((s, at) => snoozeInsight(s, i.id, at)),
    onExplain: (i) => explain(i),
    onAcknowledge: (i) => apply((s, at) => acknowledgeInsight(s, i.id, at)),
  };
}
