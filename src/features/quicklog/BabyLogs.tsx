import { useEffect, useState } from 'react';
import { BottomSheet } from '../../components/Sheet';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import type { BleedingLevel, Child } from '../../domain/types';
import { useDomain, useWeave } from '../../state/store';
import { useNow } from '../../state/clock';
import { cap, lastOf } from '../../state/selectors';
import { abandonLog, commitLog, isLogging } from '../../metrics/timeToLog';
import { useToast } from '../../app/Toast';

/**
 * Postpartum quick logs (10.1):
 *  - Diaper: inline chooser (Wet, Dirty, Both). One tap logs; chooser closes.
 *  - Bleeding: small sheet, four levels, last-used preselected; one tap logs.
 *    Heavy also raises the R14 escalation (rules.ts) as soon as it is saved.
 */

type DiaperKind = 'wet' | 'dirty' | 'both';
const DIAPERS: { kind: DiaperKind; label: string }[] = [
  { kind: 'wet', label: S.diaperWet.text },
  { kind: 'dirty', label: S.diaperDirty.text },
  { kind: 'both', label: S.diaperBoth.text },
];

export function useDiaperLog() {
  const log = useWeave((s) => s.log);
  const undo = useWeave((s) => s.undo);
  const toast = useToast();
  return (child: Child, kind: DiaperKind) => {
    const e = log({ kind: 'child', childId: child.id }, { type: 'diaper', kind }, 'quick');
    commitLog('diaper');
    toast(fmt(S.toastDiaper, { name: child.name, kind: kind === 'both' ? 'wet and dirty' : kind }), () => undo([e.id]));
  };
}

/** Opens under the cards as a full-width strip; Escape or the row's + again closes it. */
export function DiaperChooser({ child, onDone }: { child: Child; onDone: () => void }) {
  const logDiaper = useDiaperLog();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLogging()) abandonLog('diaper');
        onDone();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);
  return (
    <div role="group" aria-label={fmt(S.diaperChooserA11y, { name: child.name })} className="flex w-full items-center gap-2 rounded-list bg-surface p-2">
      <span className="type-name shrink-0 px-2 text-ink">{S.diaperSheetTitle.text}</span>
      {DIAPERS.map((d, i) => (
        <button
          key={d.kind}
          type="button"
          autoFocus={i === 0}
          onClick={() => {
            logDiaper(child, d.kind);
            onDone();
          }}
          className="min-h-[44px] flex-1 rounded-pill border border-line bg-surface font-sans text-[14px] font-semibold text-ink active:bg-bg"
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}

/** From the FAB: same three choices in a sheet. */
export function DiaperSheet({ open, onOpenChange, child }: { open: boolean; onOpenChange: (o: boolean) => void; child?: Child }) {
  const logDiaper = useDiaperLog();
  if (!child) return null;
  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (!o && isLogging()) abandonLog('diaper');
        onOpenChange(o);
      }}
      title={S.diaperSheetTitle.text}
      subtitle={child.name}
    >
      <div className="flex gap-2 pb-2">
        {DIAPERS.map((d) => (
          <button
            key={d.kind}
            type="button"
            onClick={() => {
              logDiaper(child, d.kind);
              onOpenChange(false);
            }}
            className="min-h-[56px] flex-1 rounded-pill border border-line bg-surface font-sans text-[15px] font-semibold text-ink active:bg-bg"
          >
            {d.label}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}

const LEVELS: { level: BleedingLevel; label: string }[] = [
  { level: 'spotting', label: S.bleedingSpotting.text },
  { level: 'light', label: S.bleedingLight.text },
  { level: 'medium', label: S.bleedingMedium.text },
  { level: 'heavy', label: S.bleedingHeavy.text },
];

export function BleedingSheet({ open, onOpenChange, entry = 'fab' }: { open: boolean; onOpenChange: (o: boolean) => void; entry?: string }) {
  const state = useDomain();
  const now = useNow();
  const log = useWeave((s) => s.log);
  const undo = useWeave((s) => s.undo);
  const toast = useToast();
  const last = lastOf(state, now, 'bleeding', (l) => l.subject.kind === 'her');
  const [main, setMain] = useState<HTMLElement | null>(null);
  useEffect(() => setMain(document.querySelector<HTMLElement>('#device main')), []);
  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (!o && isLogging()) abandonLog('bleeding');
        onOpenChange(o);
      }}
      title={S.bleedingSheetTitle.text}
      subtitle={last ? fmt(S.bleedingLastUsed, { level: cap(last.level) }) : undefined}
    >
      <div role="radiogroup" aria-label={S.bleedingSheetTitle.text} className="grid grid-cols-2 gap-2 pb-2">
        {LEVELS.map((l) => (
          <button
            key={l.level}
            type="button"
            role="radio"
            aria-checked={last?.level === l.level}
            onClick={() => {
              const e = log({ kind: 'her' }, { type: 'bleeding', level: l.level }, 'quick');
              commitLog('bleeding', entry);
              onOpenChange(false);
              toast(fmt(S.toastBleeding, { level: l.label }), () => undo([e.id]));
              // Heavy raises an escalation at the top of Today; bring it into view.
              if (l.level === 'heavy') main?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`min-h-[56px] rounded-pill border font-sans text-[15px] font-semibold ${last?.level === l.level ? 'border-ink text-ink' : 'border-line text-ink'}`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
