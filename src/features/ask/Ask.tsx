import { useRef, useState } from 'react';
import { S } from '../../content/strings';
import { Copy } from '../../components/Copy';
import { ScreenHeader } from '../../components/Shell';
import { FilterChip } from '../../components/Chip';
import { PrimaryButton, TextAction } from '../../components/Button';
import { fieldCls } from '../../components/Form';
import { formatLongDate } from '../../domain/dates';
import { addLog } from '../../domain/transitions';
import { useDomain, useWeave } from '../../state/store';
import { useNow } from '../../state/clock';
import { useToast } from '../../app/Toast';
import { useProviderSheet } from '../../app/ProviderSheet';
import { answer, suggestions, type Answer } from './answers';

/**
 * Ask AI (B33, PRD 12): scoped, quiet support. Answers come from her logs on
 * this phone; health questions end with the provider; red flags go to people.
 */
export function AskScreen() {
  const state = useDomain();
  const now = useNow();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const openProvider = useProviderSheet();
  const [thread, setThread] = useState<{ q: string; a: Answer }[]>([]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const ask = (q: string) => {
    if (!q.trim()) return;
    const a = answer(q, state, now);
    setThread((t) => [...t, { q: q.trim(), a }]);
    setText('');
    if (a.kind === 'redflag') openProvider('support');
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: 'end' }));
  };
  return (
    <div className="flex min-h-full flex-1 flex-col gap-5" data-screen="ask">
      <ScreenHeader label={formatLongDate(now)} title={S.askTitle.text} subtitle={S.askSubtitle.text} />
      <div aria-live="polite" className="flex flex-1 flex-col gap-4">
        {!thread.length ? (
          <section className="flex flex-col gap-3 rounded-card bg-surface p-5">
            <p className="type-insight-sm text-ink">{S.askEmptyLine.text}</p>
            <div className="flex flex-col items-start gap-2">
              {suggestions(state).map((s) => (
                <FilterChip key={s} selected={false} onClick={() => ask(s)} className="text-left">
                  {s}
                </FilterChip>
              ))}
            </div>
          </section>
        ) : null}
        {thread.map((m, i) => (
          <div key={i} className="flex flex-col gap-2">
            <p className="self-end rounded-[18px] rounded-br-[6px] bg-ink px-4 py-2.5 font-sans text-[14px] text-surface">
              <span className="sr-only">{S.askYou.text}: </span>
              {m.q}
            </p>
            <div className={`flex flex-col gap-2 self-start rounded-[18px] rounded-bl-[6px] px-4 py-3 ${m.a.kind === 'redflag' ? 'border-l-4 border-terracotta bg-surface' : 'bg-surface'}`}>
              <p className="font-sans text-[14px] leading-[1.45] text-ink">
                <span className="sr-only">{S.askWeave.text}: </span>
                {m.a.kind === 'health' ? <Copy entry={S.askHealth} /> : m.a.kind === 'redflag' ? <Copy entry={S.askRedFlag} /> : m.a.text}
              </p>
              {m.a.kind === 'health' ? (
                <TextAction
                  className="self-start !px-0 !text-ink"
                  onClick={() => {
                    apply((s, at) => addLog(s, { kind: 'her' }, { type: 'note', text: `For the doctor: ${m.q}` }, at, 'sheet').state);
                    toast(S.askNoteAdded.text);
                  }}
                >
                  {S.askAddNote.text}
                </TextAction>
              ) : null}
              {m.a.kind === 'redflag' ? (
                <PrimaryButton tone="ink" onClick={() => openProvider('support')}>
                  {S.askRedFlagAction.text}
                </PrimaryButton>
              ) : null}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="sticky bottom-0 flex items-center gap-2 bg-[var(--app-bottom)] pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
      >
        <input className={fieldCls} value={text} onChange={(e) => setText(e.target.value)} placeholder={S.askPlaceholder.text} aria-label={S.askPlaceholder.text} />
        <PrimaryButton type="submit" tone="ink" disabled={!text.trim()}>
          {S.askSend.text}
        </PrimaryButton>
      </form>
      <p className="font-sans text-[11px] text-ink-2">{S.askLocalNote.text}</p>
    </div>
  );
}
