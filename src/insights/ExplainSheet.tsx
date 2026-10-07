import { BottomSheet } from '../components/Sheet';
import { ListCard, ListRow, Section } from '../components/Cards';
import { TextAction } from '../components/Button';
import { S } from '../content/strings';
import { useDomain, useWeave } from '../state/store';
import { useNow } from '../state/clock';
import { useToast } from '../app/Toast';
import type { RenderedInsight } from './engine';
import { muteRule } from './engine';
import { explainData, RULE_WORDS } from './explain';

/** B32: the rule in plain words, the data behind it, and "Show fewer like this". */
export function ExplainSheet({ insight, onClose }: { insight: RenderedInsight | null; onClose: () => void }) {
  const state = useDomain();
  const now = useNow();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  if (!insight) return null;
  const rows = explainData(insight.ruleId, state, now);
  return (
    <BottomSheet open onOpenChange={(o) => !o && onClose()} title={S.explainTitle.text} subtitle={insight.headline}>
      <div className="flex flex-col gap-5 pb-2">
        <Section label={S.explainRule.text}>
          <p className="type-body text-ink">{RULE_WORDS[insight.ruleId]?.text ?? ''}</p>
        </Section>
        {rows.length ? (
          <Section label={S.explainData.text}>
            <ListCard className="!px-0">
              {rows.map((r, i) => (
                <ListRow key={i} label={r.label} value={r.value} />
              ))}
            </ListCard>
          </Section>
        ) : null}
        {insight.severity === 'escalate' ? (
          <p className="font-sans text-[12px] text-ink-2">{S.explainEscalationNote.text}</p>
        ) : (
          <TextAction
            className="self-start !px-0"
            onClick={() => {
              apply((s, at) => muteRule(s, insight.ruleId, at));
              toast(S.explainFewerDone.text);
              onClose();
            }}
          >
            {S.explainFewer.text}
          </TextAction>
        )}
      </div>
    </BottomSheet>
  );
}
