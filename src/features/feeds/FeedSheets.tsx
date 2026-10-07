import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { BottomSheet } from '../../components/Sheet';
import { ChoiceTile, TimerControls } from '../../components/Controls';
import { ListCard, ListRow } from '../../components/Cards';
import { FilterChip } from '../../components/Chip';
import { RunningPill } from '../../components/Shell';
import { NumberStepper } from '../../components/Stepper';
import { atTime } from '../../state/time';
import { fieldCls, FieldError } from '../../components/Form';
import { TextAction } from '../../components/Button';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import { formatDuration, formatTimeCompact, formatTimeSince } from '../../domain/dates';
import { formatClock } from '../../domain/labour';
import {
  discardBreastSession,
  lastBottle,
  lastBreastSide,
  lastFeedType,
  logBottle,
  logCombo,
  saveBreastSession,
  sessionSeconds,
  setBreastMinutes,
  toggleBreastSide,
  type FeedType,
} from '../../domain/feeds';
import type { Child } from '../../domain/types';
import { useDomain, useWeave } from '../../state/store';
import { now as clockNow, useNow } from '../../state/clock';
import { lastFeed } from '../../state/selectors';
import { abandonLog, commitLog, isLogging } from '../../metrics/timeToLog';
import { useToast } from '../../app/Toast';
import { useSolidsFlow } from '../food/Food';

/**
 * Feed flow (S05 to S07, B04, B05). One controller so the child card "+", the
 * FAB tile and the running pill all open the same sheets.
 *
 * Time-to-log for breastfeeds is measured to the moment a side starts (or to
 * Save when minutes are entered by hand): the feed itself is not logging time.
 */

type View = 'chooser' | 'breast' | 'bottle' | 'combo';
interface FeedFlow {
  openFeed: (childId: string) => void;
  openBreast: (childId: string) => void;
  breastOpen: boolean;
}
const Ctx = createContext<FeedFlow>({ openFeed: () => {}, openBreast: () => {}, breastOpen: false });
export const useFeedFlow = () => useContext(Ctx);

const volumeLabel = (ml: number, unit: 'oz' | 'ml') => (unit === 'oz' ? `${Math.round(ml / 30)} oz` : `${ml} ml`);

export function FeedFlowProvider({ children }: { children: ReactNode }) {
  const state = useDomain();
  const [view, setView] = useState<View | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  const child = state.children.find((c) => c.id === childId) ?? state.children.find((c) => c.id === state.timers.breastfeed?.childId);
  const openFeed = useCallback((id: string) => {
    setChildId(id);
    setView('chooser');
  }, []);
  const openBreast = useCallback((id: string) => {
    setChildId(id);
    setView('breast');
  }, []);
  const close = () => setView(null);
  return (
    <Ctx.Provider value={{ openFeed, openBreast, breastOpen: view === 'breast' }}>
      {children}
      {child ? (
        <>
          <FeedChooser child={child} open={view === 'chooser'} onClose={close} onPick={(v) => setView(v)} />
          <BreastfeedSheet child={child} open={view === 'breast'} onClose={close} />
          <BottleSheet child={child} open={view === 'bottle'} onClose={close} />
          <ComboSheet child={child} open={view === 'combo'} onClose={close} />
        </>
      ) : null}
    </Ctx.Provider>
  );
}

/** Persistent pill while a feed timer runs or a session is open (9.4). Rendered by ActivePills. */
export function FeedPill({ onOpen }: { onOpen: (childId: string) => void }) {
  const session = useDomain().timers.breastfeed;
  const now = useNow(1000);
  if (!session) return null;
  const sec = sessionSeconds(session, now);
  const time = formatClock(sec.total);
  const label = session.running ? fmt(S.runningFeed, { side: session.running.side, time }) : fmt(S.runningFeedPaused, { time });
  return <RunningPill label={label} onClick={() => onOpen(session.childId)} a11yLabel={fmt(S.runningFeedA11y, { time })} />;
}

/* ---------------- S05: type chooser ---------------- */

function FeedChooser({ child, open, onClose, onPick }: { child: Child; open: boolean; onClose: () => void; onPick: (v: View) => void }) {
  const state = useDomain();
  const now = useNow();
  const { openSolids } = useSolidsFlow();
  const last = lastFeed(state, now, child);
  const lastType = lastFeedType(state, child.id, now);
  const subtitle = !last
    ? S.feedNone.text
    : last.mode === 'breast'
      ? fmt(S.feedLastWas, { side: last.side, ago: formatTimeSince(last.at, now).toLowerCase() })
      : fmt(last.mode === 'bottle' ? S.feedLastBottle : S.feedLastSolids, { ago: formatTimeSince(last.at, now).toLowerCase() });
  const tiles: { type: FeedType; icon: 'breastfeed' | 'bottle' | 'solids' | 'combo'; label: string; view?: View }[] = [
    { type: 'breast', icon: 'breastfeed', label: S.breastfeed.text, view: 'breast' },
    { type: 'bottle', icon: 'bottle', label: S.bottleFeed.text, view: 'bottle' },
    { type: 'solids', icon: 'solids', label: S.solids.text },
    { type: 'combo', icon: 'combo', label: S.comboFeed.text, view: 'combo' },
  ];
  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          if (isLogging()) abandonLog('other');
          onClose();
        }
      }}
      title={S.feedSheetTitle.text}
      subtitle={subtitle}
    >
      <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 pb-2">
        {tiles.map((tile) => (
          <ChoiceTile
            key={tile.type}
            icon={tile.icon}
            label={tile.label}
            highlighted={lastType === tile.type}
            onClick={() => (tile.view ? onPick(tile.view) : (onClose(), openSolids(child.id)))}
          />
        ))}
      </div>
    </BottomSheet>
  );
}

/* ---------------- S07: breastfeed ---------------- */

function BreastfeedSheet({ child, open, onClose }: { child: Child; open: boolean; onClose: () => void }) {
  const state = useDomain();
  const apply = useWeave((s) => s.apply);
  const toast = useToast();
  const undo = useWeave((s) => s.undo);
  const now = useNow(1000);
  const session = state.timers.breastfeed?.childId === child.id ? state.timers.breastfeed : undefined;
  const sec = session ? sessionSeconds(session, now) : { left: 0, right: 0, total: 0 };
  const [editing, setEditing] = useState<'left' | 'right' | null>(null);
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const committed = useRef(false);
  useEffect(() => {
    if (open) {
      setTried(false);
      setEditing(null);
      committed.current = Boolean(session);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const lastSide = lastBreastSide(state, child.id, now);
  const firstAction = () => {
    if (!committed.current) {
      committed.current = true;
      commitLog('feed_breast');
    }
  };
  const save = () => {
    setTried(true);
    if (!session || sec.total < 1) return;
    let entries: { id: string }[] = [];
    apply((s, at) => {
      const r = saveBreastSession(s, at, note.trim() || undefined);
      entries = r.entries;
      return r.state;
    });
    firstAction();
    setNote('');
    onClose();
    const what = [sec.left >= 1 ? `left ${Math.max(1, Math.round(sec.left / 60))} m` : null, sec.right >= 1 ? `right ${Math.max(1, Math.round(sec.right / 60))} m` : null].filter(Boolean).join(', ');
    toast(fmt(S.toastFeed, { name: child.name, what }), () => undo(entries.map((e) => e.id)));
  };
  const running = Boolean(session?.running);

  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (o) return;
        // A running timer keeps going behind the pill; a paused, unsaved session is discarded (after the one prompt).
        if (!running && session) apply((s) => discardBreastSession(s));
        if (isLogging()) abandonLog('feed_breast');
        onClose();
      }}
      title={S.breastfeed.text}
      onSave={save}
      dirty={!running && sec.total >= 1}
    >
      <div className="flex flex-col gap-2.5 pb-2">
        <TimerControls
          left={{ side: 'left', minutes: Math.floor(sec.left / 60), running: session?.running?.side === 'left' }}
          right={{ side: 'right', minutes: Math.floor(sec.right / 60), running: session?.running?.side === 'right' }}
          lastSide={lastSide}
          onToggle={(side) => {
            apply((s, at) => toggleBreastSide(s, child.id, side, at));
            firstAction();
          }}
          onEdit={(side) => setEditing(side)}
        />
        {editing ? (
          <div className="flex items-center gap-2 px-5">
            <label className="font-sans text-[13px] font-semibold text-ink" htmlFor="bf-min">
              {fmt(S.editMinutesA11y, { side: editing })}
            </label>
            <input
              id="bf-min"
              autoFocus
              inputMode="numeric"
              className={`${fieldCls} w-20`}
              defaultValue={Math.round((editing === 'left' ? sec.left : sec.right) / 60)}
              onBlur={(e) => {
                const m = Math.max(0, Math.min(90, Number(e.target.value) || 0));
                apply((s, at) => setBreastMinutes(s, child.id, editing, m, at));
                setEditing(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          </div>
        ) : null}
        <div className="h-px bg-line" />
        <ListCard className="!px-4">
          <ListRow size="lg" label={S.startTime.text} value={session ? `Today ${formatTimeCompact(session.sessionStart)}` : '--'} />
          <ListRow size="lg" label={S.totalTime.text} value={formatDuration(sec.total / 60)} />
          <li className="flex min-h-[52px] items-center gap-3">
            <label htmlFor="bf-note" className="type-row shrink-0 text-ink">
              {S.notes.text}
            </label>
            <input id="bf-note" className="min-h-[44px] w-full bg-transparent text-right font-sans text-[14px] text-ink-2 outline-none placeholder:text-ink-3" value={note} onChange={(e) => setNote(e.target.value)} />
          </li>
        </ListCard>
        <FieldError>{tried && sec.total < 1 ? S.breastSaveEmpty.text : undefined}</FieldError>
        {session && !running ? (
          <TextAction className="self-start" onClick={() => (apply((s) => discardBreastSession(s)), onClose())}>
            {S.discardFeed.text}
          </TextAction>
        ) : null}
      </div>
    </BottomSheet>
  );
}

/* ---------------- B04: bottle ---------------- */

function ContentChips({ value, onChange }: { value: 'formula' | 'expressed'; onChange: (v: 'formula' | 'expressed') => void }) {
  return (
    <div role="radiogroup" className="flex gap-2">
      {(['formula', 'expressed'] as const).map((c) => (
        <FilterChip key={c} role="radio" aria-checked={value === c} selected={value === c} onClick={() => onChange(c)}>
          {c === 'formula' ? S.bottleFormula.text : S.bottleExpressed.text}
        </FilterChip>
      ))}
    </div>
  );
}

function useBottleDefaults(child: Child, open: boolean) {
  const state = useDomain();
  const last = lastBottle(state, child.id);
  const unit = state.her.units.volume;
  const [ml, setMl] = useState(last?.ml ?? (unit === 'oz' ? 90 : 60));
  const [content, setContent] = useState<'formula' | 'expressed'>(last?.content ?? 'formula');
  const [time, setTime] = useState(format(clockNow(), 'HH:mm'));
  useEffect(() => {
    if (!open) return;
    setMl(last?.ml ?? (unit === 'oz' ? 90 : 60));
    setContent(last?.content ?? 'formula');
    setTime(format(clockNow(), 'HH:mm'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return { ml, setMl, content, setContent, time, setTime, unit, step: unit === 'oz' ? 30 : 10 };
}

function BottleSheet({ child, open, onClose }: { child: Child; open: boolean; onClose: () => void }) {
  const apply = useWeave((s) => s.apply);
  const undo = useWeave((s) => s.undo);
  const toast = useToast();
  const b = useBottleDefaults(child, open);
  const save = () => {
    let id = '';
    apply((s) => {
      const r = logBottle(s, child.id, b.ml, b.content, atTime(b.time));
      id = r.entry.id;
      return r.state;
    });
    commitLog('feed_bottle');
    onClose();
    toast(fmt(S.toastFeed, { name: child.name, what: `${b.content}, ${volumeLabel(b.ml, b.unit)}` }), () => undo([id]));
  };
  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          if (isLogging()) abandonLog('feed_bottle');
          onClose();
        }
      }}
      title={S.bottleTitle.text}
      onSave={save}
    >
      <div className="flex flex-col gap-5 pb-2">
        <NumberStepper value={b.ml} onChange={b.setMl} step={b.step} min={b.step} max={400} format={(v) => volumeLabel(v, b.unit)} label={S.amount.text} />
        <ContentChips value={b.content} onChange={b.setContent} />
        <label className="flex items-center justify-between gap-3">
          <span className="type-row text-ink">{S.bottleTime.text}</span>
          <input type="time" className={`${fieldCls} w-32`} value={b.time} onChange={(e) => b.setTime(e.target.value)} />
        </label>
      </div>
    </BottomSheet>
  );
}

/* ---------------- B05: combo ---------------- */

function ComboSheet({ child, open, onClose }: { child: Child; open: boolean; onClose: () => void }) {
  const state = useDomain();
  const apply = useWeave((s) => s.apply);
  const undo = useWeave((s) => s.undo);
  const toast = useToast();
  const b = useBottleDefaults(child, open);
  const lastSide = lastBreastSide(state, child.id, clockNow());
  const lastBreast = state.logs.filter((l) => l.type === 'feed' && l.mode === 'breast' && l.subject.kind === 'child' && l.subject.childId === child.id).sort((a, c) => (a.at < c.at ? 1 : -1))[0];
  const [side, setSide] = useState<'left' | 'right'>(lastSide === 'left' ? 'right' : 'left');
  const [minutes, setMinutes] = useState(lastBreast && lastBreast.type === 'feed' && lastBreast.mode === 'breast' ? lastBreast.minutes : 10);
  const save = () => {
    let ids: string[] = [];
    apply((s) => {
      const r = logCombo(s, child.id, { side, minutes, ml: b.ml, content: b.content }, atTime(b.time));
      ids = r.entries.map((e) => e.id);
      return r.state;
    });
    commitLog('feed_combo');
    onClose();
    toast(fmt(S.toastFeed, { name: child.name, what: `${side} ${minutes} m and ${volumeLabel(b.ml, b.unit)}` }), () => undo(ids));
  };
  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          if (isLogging()) abandonLog('feed_combo');
          onClose();
        }
      }}
      title={S.comboTitle.text}
      onSave={save}
    >
      <div className="flex flex-col gap-5 pb-2">
        <section className="flex flex-col gap-3" aria-label={S.comboBreast.text}>
          <h3 className="type-micro text-ink-3">{S.comboBreast.text}</h3>
          <div role="radiogroup" className="flex gap-2">
            {(['left', 'right'] as const).map((sd) => (
              <FilterChip key={sd} role="radio" aria-checked={side === sd} selected={side === sd} onClick={() => setSide(sd)}>
                {sd === 'left' ? S.sideLeft.text : S.sideRight.text}
              </FilterChip>
            ))}
          </div>
          <NumberStepper value={minutes} onChange={setMinutes} step={1} min={1} max={90} format={(v) => `${v} m`} label={S.minutesLabel.text} />
        </section>
        <section className="flex flex-col gap-3" aria-label={S.comboBottle.text}>
          <h3 className="type-micro text-ink-3">{S.comboBottle.text}</h3>
          <NumberStepper value={b.ml} onChange={b.setMl} step={b.step} min={b.step} max={400} format={(v) => volumeLabel(v, b.unit)} label={S.amount.text} />
          <ContentChips value={b.content} onChange={b.setContent} />
        </section>
        <label className="flex items-center justify-between gap-3">
          <span className="type-row text-ink">{S.bottleTime.text}</span>
          <input type="time" className={`${fieldCls} w-32`} value={b.time} onChange={(e) => b.setTime(e.target.value)} />
        </label>
      </div>
    </BottomSheet>
  );
}
