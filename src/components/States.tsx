import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { S } from '../content/strings';
import { PrimaryButton, TextAction } from './Button';

/** EmptyState (7.5): one serif line, one action, no illustration clutter. */
export function EmptyState({ line, action, onAction }: { line: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex w-full flex-col items-start gap-4 rounded-list bg-surface p-5">
      <p className="type-insight-sm text-ink">{line}</p>
      {action && onAction ? (
        <PrimaryButton tone="ink" onClick={onAction}>
          {action}
        </PrimaryButton>
      ) : null}
    </div>
  );
}

/** Error state shared by every screen (16.5). */
export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div role="alert" className="flex w-full flex-col items-start gap-3 rounded-list bg-surface p-5">
      <p className="type-insight-sm text-ink">{S.errorTitle.text}</p>
      <p className="type-body text-ink-2">{S.errorBody.text}</p>
      {onRetry ? <TextAction onClick={onRetry}>{S.tryAgain.text}</TextAction> : null}
    </div>
  );
}

/** Catches render errors so one broken section never blanks the screen. */
export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Weave screen error', error, info.componentStack);
  }
  render() {
    if (this.state.error) return this.props.fallback ?? <ErrorState onRetry={() => this.setState({ error: null })} />;
    return this.props.children;
  }
}

/**
 * Inline Undo (10.3): no modal; the changed value shows a quiet "Undo" for
 * about four seconds.
 */
export const UNDO_MS = 4000;

export function useUndo() {
  const [pending, setPending] = useState<{ key: string; undo: () => void } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const offer = (key: string, undo: () => void) => {
    window.clearTimeout(timer.current);
    setPending({ key, undo });
    timer.current = window.setTimeout(() => setPending(null), UNDO_MS);
  };
  const run = () => {
    pending?.undo();
    window.clearTimeout(timer.current);
    setPending(null);
  };
  return { pendingKey: pending?.key, offer, run };
}

export function InlineUndo({ visible, onUndo, label = S.undo.text }: { visible: boolean; onUndo: () => void; label?: string }) {
  return (
    <span aria-live="polite" className="inline-flex">
      {visible ? (
        <button type="button" onClick={onUndo} className="hit-44 font-sans text-[12px] font-semibold text-sage-600 underline underline-offset-2">
          {label}
        </button>
      ) : null}
    </span>
  );
}

/** Toast with Undo, for logs made from places without an inline value (FAB sheet). */
export function Toast({ message, onUndo, onDone }: { message: string; onUndo?: () => void; onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, UNDO_MS);
    return () => window.clearTimeout(id);
  }, [onDone]);
  return (
    <div role="status" className="flex min-h-[44px] items-center justify-between gap-3 rounded-pill bg-ink px-5 py-2 text-surface shadow-sheet">
      <span className="font-sans text-[13px] font-medium">{message}</span>
      {onUndo ? (
        <button type="button" onClick={onUndo} className="hit-44 font-sans text-[13px] font-semibold text-sage-100">
          {S.undo.text}
        </button>
      ) : null}
    </div>
  );
}
