import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { BottomSheet } from '../../components/Sheet';
import { PrimaryButton, TextAction } from '../../components/Button';
import { RunningPill } from '../../components/Shell';
import { Field, fieldCls, FieldError } from '../../components/Form';
import { S } from '../../content/strings';
import { fmt } from '../../content/copy';
import { formatDuration, formatTimeCompact } from '../../domain/dates';
import { formatClock } from '../../domain/labour';
import { cancelSleep, endSleep, logPastSleep, startSleep } from '../../domain/sleep';
import type { Child } from '../../domain/types';
import { useDomain, useWeave } from '../../state/store';
import { now as clockNow, useNow } from '../../state/clock';
import { atTime, hhmm } from '../../state/time';
import { abandonLog, commitLog, isLogging } from '../../metrics/timeToLog';
import { useToast } from '../../app/Toast';

/**
 * Sleep (B06). If a sleep is running the sheet shows "End sleep"; otherwise
 * "Start now" or a past sleep. While running, a pill sits above the nav on
 * every screen ("Sleeping, 0:42", tap to end) (9.4).
 */

const Ctx = createContext<{ openSleep: (childId: string) => void; sleepOpen: boolean }>({ openSleep: () => {}, sleepOpen: false });
export const useSleepFlow = () => useContext(Ctx);

export function SleepFlowProvider({ children }: { children: ReactNode }) {
  const state = useDomain();
  const [childId, setChildId] = useState<string | null>(null);
  const openSleep = useCallback((id: string) => setChildId(id), []);
  const child = state.children.find((c) => c.id === childId);
  return (
    <Ctx.Provider value={{ openSleep, sleepOpen: Boolean(childId) }}>
      {children}
      {child ? <SleepSheet child={child} open onClose={() => setChildId(null)} /> : null}
    </Ctx.Provider>
  );
}

export function SleepPill() {
  const state = useDomain();
  const { openSleep } = useSleepFlow();
  const now = useNow(1000);
  const t = state.timers.sleep;
  if (!t || t.subject.kind !== 'child') return null;
  const childId = t.subject.childId;
  const name = state.children.find((c) => c.id === childId)?.name ?? '';
  // "0:42" reads as hours and minutes, as in PRD 9.4.
  const ms = now.getTime() - new Date(t.start).getTime();
  const hm = `${Math.floor(ms / 3600_000)}:${String(Math.floor((ms % 3600_000) / 60_000)).padStart(2, '0')}`;
  return <RunningPill label={fmt(S.runningSleep, { time: hm })} a11yLabel={fmt(S.runningSleepA11y, { name, time: hm })} onClick={() => openSleep(childId)} />;
}

function SleepSheet({ child, open, onClose }: { child: Child; open: boolean; onClose: () => void }) {
  const state = useDomain();
  const apply = useWeave((s) => s.apply);
  const undo = useWeave((s) => s.undo);
  const toast = useToast();
  const now = useNow(1000);
  const running = state.timers.sleep?.subject.kind === 'child' && state.timers.sleep.subject.childId === child.id ? state.timers.sleep : undefined;
  const [from, setFrom] = useState(hhmm(new Date(clockNow().getTime() - 3600_000)));
  const [to, setTo] = useState(hhmm(clockNow()));
  const [error, setError] = useState(false);
  useEffect(() => {
    setFrom(hhmm(new Date(clockNow().getTime() - 3600_000)));
    setTo(hhmm(clockNow()));
    setError(false);
  }, [open]);

  const close = (o: boolean) => {
    if (o) return;
    if (isLogging()) abandonLog('sleep');
    onClose();
  };

  const start = () => {
    apply((s, at) => startSleep(s, { kind: 'child', childId: child.id }, at));
    commitLog('sleep');
    toast(fmt(S.toastSleepStarted, { name: child.name }));
    onClose();
  };
  const end = () => {
    let id = '';
    let mins = 0;
    apply((s, at) => {
      const r = endSleep(s, at);
      id = r.entry.id;
      if (r.entry.type === 'sleep') mins = (new Date(r.entry.end!).getTime() - new Date(r.entry.start).getTime()) / 60_000;
      return r.state;
    });
    commitLog('sleep');
    toast(fmt(S.toastSleepEnded, { name: child.name, duration: formatDuration(mins) }), () => undo([id]));
    onClose();
  };
  const savePast = () => {
    const endAt = atTime(to);
    const startAt = atTime(from);
    if (startAt > endAt) startAt.setDate(startAt.getDate() - 1);
    try {
      let id = '';
      apply((s, at) => {
        const r = logPastSleep(s, { kind: 'child', childId: child.id }, startAt, endAt, at);
        id = r.entry.id;
        return r.state;
      });
      commitLog('sleep');
      toast(fmt(S.toastSleepEnded, { name: child.name, duration: formatDuration((endAt.getTime() - startAt.getTime()) / 60_000) }), () => undo([id]));
      onClose();
    } catch {
      setError(true);
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={close} title={S.sleepTitle.text} subtitle={child.name}>
      {running ? (
        <div className="flex flex-col items-center gap-5 pb-2">
          <p className="type-hero text-ink" role="timer" aria-live="off">
            {formatClock((now.getTime() - new Date(running.start).getTime()) / 1000)}
          </p>
          <p className="font-sans text-[13px] text-ink-2">{fmt(S.sleepStartedAt, { time: formatTimeCompact(running.start) })}</p>
          <PrimaryButton size="lg" tone="sage" onClick={end}>
            {S.sleepEnd.text}
          </PrimaryButton>
          <TextAction onClick={() => (apply((s) => cancelSleep(s)), onClose())}>{S.sleepCancel.text}</TextAction>
        </div>
      ) : (
        <div className="flex flex-col gap-6 pb-2">
          <PrimaryButton size="lg" onClick={start}>
            {S.sleepStartNow.text}
          </PrimaryButton>
          <section className="flex flex-col gap-3" aria-label={S.sleepPast.text}>
            <h3 className="type-micro text-ink-3">{S.sleepPast.text}</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label={S.sleepFrom.text}>
                <input type="time" className={fieldCls} value={from} onChange={(e) => setFrom(e.target.value)} />
              </Field>
              <Field label={S.sleepTo.text}>
                <input type="time" className={fieldCls} value={to} onChange={(e) => setTo(e.target.value)} />
              </Field>
            </div>
            <FieldError>{error ? S.sleepPastError.text : undefined}</FieldError>
            <TextAction className="self-start !px-0 !text-ink" onClick={savePast}>
              {S.sleepSavePast.text}
            </TextAction>
          </section>
        </div>
      )}
    </BottomSheet>
  );
}
